(function () {
    if (document.querySelector('#chart')) {
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
        yearToDate.setMonth(yearToDate.getMonth() - 12);
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

        document.querySelector('.js-all').addEventListener('click', (e) => {
            if (canGetFullData) {
                loader.classList.add('active');
                chartBlock.classList.remove('active');

                dateQueryParam = '';
                canGetFullData = false;
                fullData = [];
                getDataByPage(page);
            }
        })
        // -------------------------
        function initialiseChart(data) {
            data = data.filter(
                row => {
                    return row['TRADEDATE'] && row['HIGH'] && row['LOW'] && row['CLOSE'] && row['OPEN']
                }
            );
            let svg = document.querySelector('#chart');
            const margin = { top: 10, right: 50, bottom: 75, left: 10 };
            const margin2 = { top: 490, right: 50, bottom: 50, left: 10 };
            const margin3 = { top: 550, right: 50, bottom: 10, left: 10 };

            const width = svg.offsetWidth - margin.left - margin.right;
            const height = svg.offsetHeight - margin.top - margin.bottom;
            const height2 = svg.offsetHeight - margin2.top - margin2.bottom;
            const height3 = svg.offsetHeight - margin3.top - margin3.bottom;

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
            let y = d3.scaleLinear().domain([yMin, yMax]).range([height - margin.top - margin.bottom, 0]);

            let x2 = d3.scaleTime().domain([xMin, xMax]).range([0, width]);
            let y2 = d3.scaleLinear().domain([yMin2, yMax2]).range([height2, 0]);

            let x3 = d3.scaleTime().domain([xMin, xMax]).range([0, width]);
            let y3 = d3.scaleLinear().domain([yMin, yMax]).range([height3, 0]);

            let xAxis = d3.axisBottom(x);
            let yAxis = d3.axisRight(y);

            let brush = d3.brushX()
                .extent([[0, 0], [width, height3]])
                .on("start brush end", brushed);

            let zoom = d3.zoom()
                .scaleExtent([1, Infinity])
                .translateExtent([[0, 0], [width, height]])
                .extent([[0, 0], [width, height]])
                .on("zoom", zoomed);

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
                .call(xAxis);

            // price y axis
            svg
                .append('g')
                .attr('id', 'yAxis')
                .attr("class", "axis axis--y")
                .attr('transform', `translate(${width + 4}, 0)`)
                .call(yAxis);

            // clip for zoom
            let clip = svg.append("defs").append("svg:clipPath")
                .attr("id", "clip")
                .append("svg:rect")
                .attr("width", width + 3)
                .attr("height", height)
                .attr("x", 0)
                .attr("y", 0);

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
                .attr('stroke', 'steelblue')
                .attr('stroke-width', '1')
                .attr("clip-path", "url(#clip)")
                .attr('d', line);

            // brush line
            const line2 = d3
                .line()
                .x(d => {
                    return x3(d['TRADEDATE']);
                })
                .y(d => {
                    return y3(d['CLOSE']);
                });

            svg
                .append('path')
                .data([data])
                .style('fill', 'none')
                .attr('id', 'priceChart')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', '1')
                .attr('transform', `translate(0, ${margin3.top})`)
                .attr('d', line2);

            let zoom_line = svg.append("g")
                .attr("class", "zoom_line")
                .attr("transform", `translate(0, ${margin3.top})`);

            // brush for zoom
            zoom_line.append("g")
                .attr("class", "brush")
                .attr('stroke-width', '0')
                .call(brush)
                .call(brush.move, x.range());

            d3.select('.selection')
                .attr('fill', 'rgba(102, 133, 194, 0.3)')

            // y crosshair
            const focus = svg
                .append('g')
                .attr('class', 'focus')
                .style('opacity', '0');

            focus.append('line').classed('y', true);
            focus.append('circle')
                .attr('r', 4)
                .attr('fill', 'rgb(255, 255, 255)')
                .attr('stroke', 'rgb(124, 181, 236)')
                .attr('stroke-width', '10')
                .attr('stroke-opacity', '0.5');
            focus.append('circle')
                .attr('r', 2)
                .attr('fill', 'rgb(124, 181, 236)')
                .attr('stroke', 'rgb(124, 181, 236)')

            // crosshair overlay
            svg
                .append('rect')
                .attr('class', 'overlay-cross')
                .attr('width', width)
                .attr('height', height)
                .on('mouseover', () => { focus.style('opacity', '1') })
                .on('mouseout', () => {
                    focus.style('opacity', '0')
                    d3.selectAll('.lineLegendBlock').style('opacity', '0');
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
                const currentPoint = correspondingDate - d0['TRADEDATE'] > d1['TRADEDATE'] - correspondingDate ? d1 : d0;
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
                d3.selectAll('.lineLegendBlock').remove();

                let xClass = (x(currentData['TRADEDATE']) >= width - 170) ? ' xGoLeft' : '';
                let yClass = (y(currentData['CLOSE']) >= height - 100) ? ' yGoTop' : '';

                let xMargin = (x(currentData['TRADEDATE']) >= width - 170) ? width : 0;
                let yMargin = (y(currentData['CLOSE']) >= height - 100) ? height : 0;

                svg.append('foreignObject')
                    .attr('class', `lineLegendBlock${xClass}${yClass}`)
                    .attr('width', width)
                    .attr('height', height)
                    .html((d) => {
                        return `<div>${currentData['TRADEDATE'].toLocaleDateString()}<br>Закрытие: ${currentData['CLOSE'].toFixed(2)}<br>Объём (акции): ${numberWithSpaces(currentData['VOLUME'])}`;
                    })
                    .attr('transform', `translate(${x(currentData['TRADEDATE']) - xMargin}, ${y(currentData['CLOSE']) - yMargin})`);
            };

            function drawColumns(data) {
                const volData = data.filter(d => d['VOLUME'] !== null && d['VOLUME'] !== 0);

                const yMinVolume = d3.min(volData, d => {
                    return Math.min(d['VOLUME']);
                });
                const yMaxVolume = d3.max(volData, d => {
                    return Math.max(d['VOLUME']);
                });

                let yVolumeScale = d3
                    .scaleLinear()
                    .domain([yMinVolume, yMaxVolume])
                    .range([height, height - margin.top - margin.bottom]);

                // remove all before draw for zoom
                svg.selectAll("rect.vol").remove();

                // draw columns
                svg
                    .selectAll()
                    .data(volData)
                    .enter()
                    .append('rect')
                    .attr('x', d => {
                        return xScale(d['TRADEDATE']);
                    })
                    .attr('y', d => {
                        return yVolumeScale(d['VOLUME']);
                    })
                    .attr('class', 'vol')
                    .attr("clip-path", "url(#clip)")
                    .attr('fill', (d, i) => {
                        if (i === 0) {
                            return '#03a678';
                        } else {
                            return volData[i - 1].CLOSE > d.CLOSE ? 'rgb(209, 66, 66)' : 'rgb(36, 132, 123)';
                        }
                    })
                    .attr('width', 2)
                    .attr('height', d => {
                        return height - yVolumeScale(d['VOLUME']);
                    });

                // y axis for volumes
                if (!document.querySelector('.vol-y')) {
                    svg.append('g')
                        .attr('class', 'vol-y')
                        .attr("transform", `translate(${width + 4}, 0)`)
                        .call(d3.axisRight(yVolumeScale).ticks(0).tickFormat(x => `${nFormatter(x, 1)}`));

                    d3.select('.vol-y')
                        .append('rect')
                        .attr('width', 6)
                        .attr('height', 3)
                        .attr('fill', '#fff')
                        .attr('transform', `translate(1, ${height - margin.top - margin.bottom - 1})`)
                }
            }

            d3.select('.axis--y')
                .append('rect')
                .attr('width', 6)
                .attr('height', 3)
                .attr('fill', '#fff')
                .attr('transform', `translate(1, ${height - margin.top - margin.bottom - 1})`)

            /* zoom by brush */
            function brushed() {
                if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
                let s = d3.event.selection || x3.range();
                x.domain(s.map(x3.invert, x3));
                xScale.domain(s.map(x3.invert, x3));
                svg.select(".line").attr("d", line);
                drawColumns(data);
                svg.select(".axis--x").call(xAxis);
                svg.select(".zoom").call(zoom.transform, d3.zoomIdentity.scale(width / (s[1] - s[0])).translate(-s[0], 0));
            }
            function zoomed() {
                if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
                let t = d3.event.transform;
                x.domain(t.rescaleX(x3).domain());
                x2.domain(t.rescaleX(x3).domain());
                svg.select(".line").attr("d", line);
                svg.select(".axis--x").call(xAxis);
                zoom_line.select(".brush").call(brush.move, x.range().map(t.invertX, t));
            }

            const totalMonths = monthDiff(xMin, xMax);
            const timeSelectorBtns = document.querySelectorAll('.js-timeselect');
            Array.prototype.forEach.call(timeSelectorBtns, function (timeSelectorBtn, i) {
                if (!canGetFullData) {
                    timeSelectorBtn.classList.remove('active');
                }

                timeSelectorBtn.addEventListener('click', (event) => {
                    let thisBtn = event.target;
                    Array.prototype.forEach.call(timeSelectorBtns, function (el, i) {
                        el.classList.remove('active');
                    });
                    thisBtn.classList.add('active');
                    let range = timeSelectorBtn.dataset.range;
                    if (range === '0') {
                        d3.select(".brush").transition().duration(3000).call(brush.move, [0, width]);
                    } else {
                        d3.select(".brush").transition().duration(1000).call(brush.move, [width - width / (totalMonths / range), width]);
                    }

                })
            });

            // set brush on time interval changes
            if (canGetFullData) {
                d3.select(".brush").transition().duration(1000).call(brush.move, [width - width / totalMonths, width]);
            }

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
        function monthDiff(d1, d2) {
            var months;
            months = (d2.getFullYear() - d1.getFullYear()) * 12;
            months -= d1.getMonth();
            months += d2.getMonth();
            return months <= 0 ? 0 : months;
        }
        function nFormatter(num, digits) {
            const lookup = [
                { value: 1, symbol: "" },
                { value: 1e3, symbol: "k" },
                { value: 1e6, symbol: "M" },
                { value: 1e9, symbol: "G" },
                { value: 1e12, symbol: "T" },
                { value: 1e15, symbol: "P" },
                { value: 1e18, symbol: "E" }
            ];
            const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            let item = lookup.slice().reverse().find(function (item) {
                return num >= item.value;
            });
            return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
        }
        function numberWithSpaces(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        }
        // -------------------------

        // start
        getDataByPage(page);
    }

})();