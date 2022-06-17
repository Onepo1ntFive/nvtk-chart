(function () {
    let fullData = [];
    let yearToDate = null;
    let dateQueryParam = '';
    let chart = null;
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
                    initialiseChart(fullData);

                    if (!canGetFullData) {
                    }
                }
            })
    }

    // 
    function transformDataForHighcharts(data) {
        let transformedData = {};
        transformedData.data = [];
        transformedData.volume = [];

        //get items by board
        let filteredData = data.filter(item => item[0] === board);

        for (const [index, item] of filteredData.entries()) {
            if (!!item[6]) {
                // costs
                transformedData.data.push(
                    {
                        x: new Date(item[1]).getTime(),
                        y: item[13],
                        date: new Date(item[1]),
                        open: item[6],
                        close: item[11],
                        high: item[8],
                        low: item[7],
                        cost: item[13],
                    }
                )

                // volumes
                let prevIndex = (index > 0) ? index - 1 : index;
                let volume = filteredData[index][13];
                let prevVolume = filteredData[prevIndex][13];

                let green = 'rgb(36, 132, 123)'; // green
                let red = 'rgb(209, 66, 66)'; // red
                let colColor = (volume > prevVolume) ? green : red;

                transformedData.volume.push(
                    {
                        x: new Date(item[1]).getTime(),
                        y: item[12],
                        color: colColor
                    }
                )
            }
        }
        return transformedData;
    }

    function numPrecent(num, precent) {
        return num * (precent / 100);
    }
    // -------------------------
    function initialiseChart(data) {
        data = data.filter(
            row => row['HIGH'] && row['LOW'] && row['CLOSE'] && row['OPEN']
        );

        thisYearStartDate = new Date(2010, 0, 1);

        // filter out data based on time period
        data = data.filter(row => {
            if (row['TRADEDATE']) {
                return row['TRADEDATE'] >= thisYearStartDate;
            }
        });

        var svg = document.querySelector('#chart');
        var margin = { top: 0, right: 50, bottom: 150, left: 10 };
        var margin2 = { top: 750, right: 20, bottom: 100, left: 40 };
        var margin3 = { top: 800, right: 20, bottom: 0, left: 40 };

        var width = svg.offsetWidth - margin.left - margin.right;
        var height = svg.offsetHeight - margin.top - margin.bottom;
        var height2 = svg.offsetHeight - margin2.top - margin2.bottom;
        var height3 = svg.offsetHeight - margin3.top - margin3.bottom;

        // find data range
        const xMin = d3.min(data, d => {
            return d['TRADEDATE'];
        });
        const xMax = d3.max(data, d => {
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

        let xAxis2 = d3.axisBottom(x2);
        let yAxis2 = d3.axisRight(y2);

        let xAxis3 = d3.axisBottom(x3);
        let yAxis3 = d3.axisRight(y3);

        var brush = d3.brushX()
            .extent([[0, 0], [width, height3]])
            .on("start brush end", brushed);

        var zoom = d3.zoom()
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

        // create the axes component
        // x axis
        svg
            .append('g')
            .attr('id', 'xAxis')
            .attr("class", "axis axis--x")
            .attr('transform', `translate(0, ${height})`)
            // .call(d3.axisBottom(xScale));
            .call(xAxis);

        // price y axis
        svg
            .append('g')
            .attr('id', 'yAxis')
            .attr("class", "axis axis--y")
            .attr('transform', `translate(${width}, 0)`)
            // .call(d3.axisRight(yScale));
            .call(yAxis);


        // gridlines in y axis function
        function make_y_gridlines() {
            return d3.axisLeft(y)
                .ticks(4)
        }

        // add the Y gridlines
        svg.append("g")
            .attr("class", "grid")
            .call(make_y_gridlines()
                .tickSize(-width)
                .tickFormat("")
            )

        // обрезаем основную линию для зума
        var clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width)
            .attr("height", height)
            .attr("x", 0)
            .attr("y", 0);

        // основная линия
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

        // линия для лупы
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
            .data([data]) // binds data to the line
            .style('fill', 'none')
            .attr('id', 'priceChart')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', '1')
            .attr('transform', `translate(0, ${margin3.top})`)
            .attr('d', line2);

        var context = svg.append("g")
            .attr("class", "context")
            .attr("transform", `translate(0, ${margin3.top})`);

        // добавляем кисть для зума
        context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, x.range());

        // renders y crosshair
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

        // 
        svg
            .append('rect')
            .attr('class', 'overlay-cross')
            .attr('width', width)
            .attr('height', height)
            .on('mouseover', () => focus.style('opacity', '1'))
            .on('mouseout', () => focus.style('opacity', '0'))
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
                .attr('y2', height);

            // updates the legend to display the date, open, close, high, low, and volume of the selected mouseover area
            updateLegends(currentPoint);
        }

        /* Legends */
        function updateLegends(currentData) {
            d3.selectAll('.lineLegend').remove();
            // const legendKeys = Object.keys(data[0]);
            const legendKeys = ['TRADEDATE', 'OPEN', 'CLOSE', 'HIGH', 'LOW', 'VOLUME'];
            const lineLegend = svg
                .selectAll('.lineLegend')
                .data(legendKeys)
                .enter()
                .append('g')
                .attr('class', 'lineLegend')
                .attr('transform', (d, i) => {
                    return `translate(0, ${i * 20})`;
                });
            lineLegend
                .append('text')
                .text(d => {
                    if (d === 'TRADEDATE') {
                        return `${d}: ${currentData[d].toLocaleDateString()}`;
                    } else if (
                        d === 'HIGH' ||
                        d === 'LOW' ||
                        d === 'OPEN' ||
                        d === 'CLOSE'
                    ) {
                        return `${d}: ${currentData[d].toFixed(2)}`;
                    } else {
                        return `${d}: ${currentData[d]}`;
                    }
                })
                .style('fill', 'black')
                .attr('transform', 'translate(0, 0)'); //align texts with boxes
        };

        /* Volume series bars */
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

        let column = svg
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
            .attr('fill', (d, i) => {
                if (i === 0) {
                    return '#03a678';
                } else {
                    // return volData[i - 1].CLOSE > d.CLOSE ? '#c0392b' : '#03a678'; // green bar if price is rising during that period, and red when price  is falling
                    return volData[i - 1].CLOSE > d.CLOSE ? 'rgb(209, 66, 66)' : 'rgb(36, 132, 123)';
                }
            })
            .attr('width', 3)
            .attr('height', d => {
                return height - yVolumeScale(d['VOLUME']);
            });

        // y axis for volume
        svg.append('g')
            .attr("transform", `translate(${width}, 0)`)
            .call(d3.axisRight(yVolumeScale));


        /* Zoom */
        function brushed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
            var s = d3.event.selection || x3.range();
            x.domain(s.map(x3.invert, x3));
            x2.domain(s.map(x3.invert, x3));
            svg.select(".line").attr("d", line);

            svg.select(".axis--x").call(xAxis);
            svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));
        }

        function zoomed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
            var t = d3.event.transform;
            x.domain(t.rescaleX(x3).domain());
            x2.domain(t.rescaleX(x3).domain());
            svg.select(".line").attr("d", line);
            svg.select(".axis--x").call(xAxis);
            context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
        }
    };

    const responsivefy = svg => {
        // get container + svg aspect ratio
        const container = d3.select(svg.node()),
            width = parseInt(svg.style('width')),
            height = parseInt(svg.style('height')),
            aspect = width / height;

        // get width of container and resize svg to fit it
        const resize = () => {
            var targetWidth = parseInt(container.style('width'));
            svg.attr('width', targetWidth);
            svg.attr('height', Math.round(targetWidth / aspect));
        };

        // add viewBox and preserveAspectRatio properties,
        // and call resize so that svg resizes on inital page load
        svg
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('perserveAspectRatio', 'xMinYMid')
            .call(resize);

        // to register multiple listeners for same event type,
        // you need to add namespace, i.e., 'click.foo'
        // necessary if you call invoke this function for multiple svgs
        // api docs: https://github.com/mbostock/d3/wiki/Selections#on
        d3.select(window).on('resize.' + container.attr('id'), resize);
    };
    // -------------------------

    getDataByPage(page);
})();