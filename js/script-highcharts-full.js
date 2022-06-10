(function () {
    const chartBlock = document.querySelector('.js-chart-full');
    const loaderBlock = chartBlock.nextElementSibling;
    loaderBlock.classList.add('active');

    let fullData = [];
    let dateQueryParam = '';
    let yearToDate = null;
    let chart = null;
    let canGetFullData = true;

    let board = 'TQBR';
    let page = 0;
    let itemsPerPage = 100;

    const src = `https://iss.moex.com/iss/history/engines/stock/markets/shares/boards/${board}/securities/NVTK`;

    // 
    Highcharts.setOptions({
        lang: {
            months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
            shortMonths: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
            weekdays: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
            shortWeekdays: ['Вc', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
            rangeSelectorZoom: '',
        }
    });

    // 
    async function getDataByPage(page) {
        if (canGetFullData) {
            yearToDate = new Date();
            yearToDate.setMonth(yearToDate.getMonth() - 12);
            yearToDate = yearToDate.toLocaleDateString('fr-CA');
            dateQueryParam = `&from=${yearToDate}`;
        }
        // get data dates range)
        await axios
            .get(`${src}.json?start=${page * itemsPerPage}${dateQueryParam}`)
            .then(function (response) {
                let nextPage = page + 1;
                const newData = response.data.history.data;

                if (!!newData.length) {
                    for (const item of newData) {
                        fullData.push(item);
                    }
                    getDataByPage(nextPage);
                    // get all data page by page
                } else {
                    // if data all - draw chart
                    chartBlock.classList.add('active');
                    loaderBlock.classList.remove('active');
                    chart.series[0].setData(transformDataForHighcharts(fullData).data);
                    chart.series[1].setData(transformDataForHighcharts(fullData).volume);

                    if (!canGetFullData) {
                        chart.update({
                            rangeSelector: {
                                selected: 4
                            }
                        });
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

    function drawHighchart() {
        chart = Highcharts.stockChart('chart-full', {
            title: {
                text: 'ПАО "НОВАТЭК", NVTK',
                align: 'left',
            },
            rangeSelector: {
                selected: 0,
                allButtonsEnabled: true,
                buttons: [{
                    type: 'month',
                    count: 1,
                    text: 'Месяц',
                    title: 'Просмотреть 1 месяц',
                }, {
                    type: 'month',
                    count: 3,
                    text: 'Квартал',
                    title: 'Просмотреть 3 месяца',
                }, {
                    type: 'month',
                    count: 6,
                    text: 'Пол года',
                    title: 'Просмотреть 6 месяцев',
                }, {
                    type: 'year',
                    count: 1,
                    text: 'Год',
                    title: 'Просмотреть 1 год',
                }, {
                    type: 'all',
                    text: 'Всё время',
                    title: 'За всё время',
                    events: {
                        click: function () {
                            if (canGetFullData) {
                                canGetFullData = false;
                                fullData = [];
                                chartBlock.classList.remove('active');
                                loaderBlock.classList.add('active');
                                getDataByPage(page, true)
                            }
                        }
                    }
                }],
                buttonTheme: {
                    paddingLeft: 10,
                    paddingRight: 10,
                    width: 'auto',

                },
            },

            exporting: {
                enabled: false,
            },

            tooltip: {
                shape: 'square',
                headerShape: 'callout',
                borderWidth: 0,
                shadow: false,
                shared: true,
                headerShape: 'square',
                headerFormat: '',
            },

            yAxis: [
                {
                    title: {
                        text: 'руб.',
                    },
                    height: '80%',
                    lineWidth: 1,
                    resize: {
                        enabled: true
                    },
                },
                {
                    top: '80%',
                    height: '20%',
                    offset: 0,
                    lineWidth: 1,
                    resize: {
                        enabled: true
                    },
                }
            ],

            series: [
                // shares cost line
                {
                    type: 'line',
                    name: 'nvtk',
                    label: {
                        enabled: false,
                    },
                    // data: data.data,
                    turboThreshold: 5000,
                    tooltip: {
                        shape: 'callout',
                        pointFormatter: function () {
                            let text = `${this.date.toLocaleDateString('ru-ru', { year: "numeric", month: "short", day: "numeric" })}<br><b>Открытие</b>: ${Highcharts.numberFormat(this.open, 0)}<br><b>Закрытие</b>: ${Highcharts.numberFormat(this.close, 0)}<br><b>Max</b>: ${Highcharts.numberFormat(this.high, 0)}<br><b>Min</b>: ${Highcharts.numberFormat(this.low, 0)}`;
                            return text;
                        }
                    },
                },
                // volumes graph
                {
                    type: 'column',
                    name: 'volume',
                    // data: data.volume,
                    turboThreshold: 0,
                    yAxis: 1,
                    pointWidth: 2,
                    tooltip: {
                        pointFormatter: function () {
                            return `<b>Объём</b> (акции): ${Highcharts.numberFormat(this.y, 0)}`;
                        }
                    },
                }
            ]
        });
    }

    // start
    drawHighchart();
    getDataByPage(page);
})(); // ready