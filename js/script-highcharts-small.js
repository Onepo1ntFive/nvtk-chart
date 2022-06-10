(function () {
    const chartBlock = document.querySelector('.js-chart-small');
    const loaderBlock = chartBlock.nextElementSibling;
    loaderBlock.classList.add('active');

    let fullData = [];
    let dateFrom = null;

    let board = 'TQBR';
    let page = 0;
    let itemsPerPage = 100;

    const src = `https://iss.moex.com/iss/history/engines/stock/markets/shares/boards/${board}/securities/NVTK`;

    dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - 3);
    dateFrom = dateFrom.toLocaleDateString('fr-CA');

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

    async function getDataByPage(page) {
        await axios
            .get(`${src}.json?start=${page * itemsPerPage}&from=${dateFrom}`)
            .then(function (response) {
                let nextPage = page + 1;
                const newData = response.data.history.data;

                if (!!newData.length) {
                    for (const item of newData) {
                        fullData.push(item);
                    }
                    getDataByPage(nextPage);
                } else {
                    // if data all - draw chart
                    chartBlock.classList.add('active');
                    loaderBlock.classList.remove('active');
                    drawHighchart(transformDataForHighcharts(fullData));
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
                        volume: item[12]
                    }
                )
            }
        }
        return transformedData;
    }

    function drawHighchart(data) {
        Highcharts.stockChart('chart-small', {
            chart: {
                backgroundColor: 'transparent'
            },
            title: {
                text: 'МосБиржа, NVTK, руб.',
                align: 'left',
                style: {
                    color: '#fff',
                },
            },
            rangeSelector: {
                enabled: false,
            },

            navigator: {
                enabled: false
            },

            scrollbar: {
                enabled: false
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
                headerFormat: '',
                // styles
                borderColor: '#1251A0',
                borderRadius: 5,
                borderWidth: 2,
            },

            yAxis: [
                {
                    title: {
                        text: 'руб.',
                        style: {
                            color: '#fff',
                        }
                    },
                    labels: {
                        style: {
                            color: '#fff',
                        }
                    },
                    height: '100%',
                    lineWidth: 1,
                },
            ],

            xAxis: [
                {
                    labels: {
                        style: {
                            color: '#fff',
                        }
                    },
                },
            ],

            series: [
                // shares cost line
                {
                    type: 'line',
                    name: 'NVTK',
                    label: {
                        enabled: false,
                    },
                    data: data.data,
                    turboThreshold: 5000,
                    tooltip: {
                        pointFormatter: function () {
                            let text = `${this.date.toLocaleDateString('ru-ru', { year: "numeric", month: "short", day: "numeric" })}<br><b>${Highcharts.numberFormat(this.cost, 0)}</b> руб.<br>Объём: ${Highcharts.numberFormat(this.volume, 0)}`;
                            return text;
                        }
                    },
                    // styles
                    color: '#1251A0',
                }
            ]
        });
    }

    // start
    drawHighchart(fullData);
    getDataByPage(page);
})();