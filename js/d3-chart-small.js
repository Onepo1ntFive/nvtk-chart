(function () {
    let fullData = [];
    let yearToDate = null;
    let dateQueryParam = '';
    let canGetFullData = true;

    let board = 'TQBR';
    let page = 0;
    let itemsPerPage = 100;

    const src = `https://iss.moex.com/iss/history/engines/stock/markets/shares/boards/${board}/securities/NVTK`;

    // first time get 1 year data
    yearToDate = new Date();
    yearToDate.setMonth(yearToDate.getMonth() - 3);
    yearToDate = yearToDate.toLocaleDateString('fr-CA');
    dateQueryParam = `&from=${yearToDate}`;

    loader = document.querySelector('.js-loader');
    chartBlock = document.querySelector('.js-chart');
    loader.classList.add('active');
    chartBlock.classList.remove('active');


    d3.timeFormatDefaultLocale({
        "decimal": ",",
        "thousands": ".",
        "grouping": [3],
        "currency": ["€", ""],
        "dateTime": "%a %b %e %X %Y",
        "date": "%d.%m.%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
        "shortDays": ['Вc', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
        "months": ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
        "shortMonths": ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    })

    // 
    async function getDataByPage(page) {
        await axios
            .get(`${src}.json?start=${page * itemsPerPage}${dateQueryParam}&iss.json=extended&iss.meta=off`)
            .then(function (response) {
                let nextPage = page + 1;
                const newData = response.data[1].history;

                if (!!newData.length) {
                    for (const item of newData) {
                        item.TRADEDATE = new Date(item.TRADEDATE);
                        fullData.push(item);
                    }
                    getDataByPage(nextPage);
                } else {
                    loader.classList.remove('active');
                    chartBlock.classList.add('active');
                    if (!canGetFullData) {
                        d3.select("svg").remove();
                    }
                    initialiseChart(fullData);
                }
            })
    }
    // -------------------------
    function initialiseChart(data) {
        data = data.filter(
            row => {
                return row['TRADEDATE'] && row['HIGH'] && row['LOW'] && row['CLOSE'] && row['OPEN']
            }
        );
        let svg = document.querySelector('#chart');
        const margin = { top: 10, right: 50, bottom: 30, left: 10 };

        const width = svg.offsetWidth - margin.left - margin.right;
        const height = svg.offsetHeight - margin.top - margin.bottom;

        // find data range
        let xMin = d3.min(data, d => {
            return d['TRADEDATE'];
        });
        let xMax = d3.max(data, d => {
            return d['TRADEDATE'];
        });

        const yMin = d3.min(data, d => {
            return d['CLOSE'];
        });
        const yMax = d3.max(data, d => {
            return d['CLOSE'];
        });

        const yMin2 = d3.min(data, d => {
            return d['VOLUME'];
        });
        const yMax2 = d3.max(data, d => {
            return d['VOLUME'];
        });

        let x = d3.scaleTime().domain([xMin, xMax]).range([0, width]);
        let y = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);


        let xAxis = d3.axisBottom(x);
        let yAxis = d3.axisRight(y);

        // scale using range
        const xScale = d3
            .scaleTime()
            .domain([xMin, xMax])
            .range([0, width]);

        const yScale = d3
            .scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0]);

        // add chart SVG to the page
        svg = d3.select('#chart')
            .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
            .call(responsivefy)
            .append('g')
            .attr('transform', `translate(${margin['left']}, ${margin['top']})`);

        // gridlines in y axis function
        function make_y_gridlines() {
            return d3.axisLeft(y)
                .ticks(4)
        }

        // add the y gridlines
        svg.append("g")
            .attr("class", "grid")
            .call(make_y_gridlines()
                .tickSize(-width)
                .tickFormat("")
            )

        // create the axes component
        // x axis
        svg
            .append('g')
            .attr('id', 'xAxis')
            .attr("class", "axis axis--x")
            .attr('transform', `translate(5, ${height})`)
            // .call(d3.axisBottom(xScale));
            .call(xAxis);

        // price y axis
        svg
            .append('g')
            .attr('id', 'yAxis')
            .attr("class", "axis axis--y")
            .attr('transform', `translate(${width + 4}, 0)`)
            // .call(d3.axisRight(yScale));
            .call(yAxis);

        // main line
        const line = d3
            .line()
            .x(d => {
                return x(d['TRADEDATE']);
            })
            .y(d => {
                return y(d['CLOSE']);
            });

        svg
            .append('path')
            .data([data]) // binds data to the line
            .style('fill', 'none')
            .attr("class", "line")
            .attr('id', 'priceChart')
            .attr('stroke', '#f00')
            .attr('stroke-width', '1')
            .attr('d', line);

        // y crosshair
        const focus = svg
            .append('g')
            .attr('class', 'focus')
            .style('opacity', '0');

        focus.append('line').classed('y', true);
        focus.append('circle')
            .attr('r', 2)
            .attr('fill', 'rgb(255, 255, 255)')
            .attr('stroke', 'rgb(255, 255, 255)')
            .attr('stroke-width', '10')
            .attr('stroke-opacity', '0.5');
        focus.append('circle')
            .attr('r', 2)
            .attr('fill', 'rgb(255, 255, 255)')
            .attr('stroke', 'rgb(255, 255, 255)')

        // crosshair overlay
        svg
            .append('rect')
            .attr('class', 'overlay-cross')
            .attr('width', width)
            .attr('height', height)
            .on('mouseover', () => focus.style('opacity', '1'))
            .on('mouseout', () => {
                focus.style('opacity', '0')
                d3.selectAll('.lineLegend').style('opacity', '0');
                d3.selectAll('.lineLegendBg').style('opacity', '0');
            })
            .on('mousemove', generateCrosshair);

        d3.select('.overlay-cross').style('fill', 'none');
        d3.select('.overlay-cross').style('pointer-events', 'all');

        d3.selectAll('.focus line').style('fill', 'none');
        d3.selectAll('.focus line').style('stroke', '#ccc');
        d3.selectAll('.focus line').style('stroke-width', '1px');

        //returs insertion point
        const bisectDate = d3.bisector(d => d.TRADEDATE).left;

        /* mouseover function to generate crosshair */
        function generateCrosshair() {
            //returns corresponding value from the domain
            const correspondingDate = x.invert(d3.mouse(this)[0]);
            //gets insertion point
            const i = bisectDate(data, correspondingDate, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            const currentPoint =
                correspondingDate - d0['TRADEDATE'] > d1['TRADEDATE'] - correspondingDate ? d1 : d0;
            focus.attr('transform', `translate(${x(currentPoint['TRADEDATE'])}, ${y(currentPoint['CLOSE'])})`);
            focus
                .select('line.y')
                .attr('x1', 0)
                .attr('x2', 0)
                .attr('y1', -height)
                .attr('y2', height - y(currentPoint['CLOSE']));

            // updates the legend to display the date, open, close, high, low, and volume of the selected mouseover area
            updateLegends(currentPoint);
        }

        /* Legends */
        function updateLegends(currentData) {
            d3.selectAll('.lineLegend').remove();
            d3.selectAll('.lineLegendBg').remove();

            let xPos = (x(currentData['TRADEDATE']) >= width - 175) ? -165 : 20;
            let xPosBg = (x(currentData['TRADEDATE']) >= width - 175) ? -175 : 10;

            let yPos = (y(currentData['CLOSE']) >= height - 60) ? 40 : -10;
            let yPosBg = (y(currentData['CLOSE']) >= height - 60) ? 60 : 10;

            const lineLegendBg = svg
                .append('rect')
                .attr('class', 'lineLegendBg')
                .attr('width', 165)
                .attr('height', 60)
                .attr('fill', 'rgba(255, 255, 255, 0.7)')
                .attr('transform', () => {
                    return `translate(${x(currentData['TRADEDATE']) + xPosBg}, ${y(currentData['CLOSE']) - yPosBg})`;
                })

            const legendKeys = ['TRADEDATE', 'CLOSE', 'VOLUME'];
            const lineLegend = svg
                .selectAll('.lineLegend')
                .data(legendKeys)
                .enter()
                .append('g')
                .attr('class', 'lineLegend')
                .attr('transform', (d, i) => {
                    return `translate(${x(currentData['TRADEDATE'])}, ${y(currentData['CLOSE']) + i * 15})`;
                })

            lineLegend
                .append('text')
                .text(d => {
                    if (d === 'TRADEDATE') {
                        return `${currentData[d].toLocaleDateString()}`;
                    } else if (d === 'CLOSE') {
                        return `Закрытие: ${currentData[d].toFixed(2)}`;
                    } else {
                        return `Объём (акции): ${numberWithSpaces(currentData[d])}`;
                    }
                })
                .attr('width', 155)
                .style('fill', 'black')
                .attr('transform', `translate(${xPos}, ${-yPos})`); //align texts with boxes
        };


    }; // end chart 

    function responsivefy(svg) {
        const container = d3.select(svg.node()),
            width = parseInt(svg.style('width')),
            height = parseInt(svg.style('height')),
            aspect = width / height;
        const resize = () => {
            let targetWidth = parseInt(container.style('width'));
            svg.attr('width', targetWidth);
            svg.attr('height', Math.round(targetWidth / aspect));
        };
        svg
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('perserveAspectRatio', 'xMinYMid')
            .call(resize);
        d3.select(window).on('resize.' + container.attr('id'), resize);


    };
    // -------------------------
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    function numberWithSpaces(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    // -------------------------

    // start
    getDataByPage(page);
})();