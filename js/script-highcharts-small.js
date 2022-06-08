(function () {
    // ready
    const chartBlock = document.querySelector('.js-chart-small');
    const loaderBlock = chartBlock.nextElementSibling;
    loaderBlock.classList.add('active');

    const src = 'https://iss.moex.com/iss/history/engines/stock/markets/shares/securities/';

    let fullData = [];
    let dateFrom = null;
    let dateTill = null;

    let board = 'TQBR';
    let page = 0;
    let itemsPerPage = 100;
    let totalItems = null;
    let pages = null;

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
    let queryParams = new URLSearchParams();
    let params = null;
    let defaultParams = {
        'iss.meta': 'off',
        'lang': 'ru',
    }
    for (let key in defaultParams) {
        queryParams.append(key, defaultParams[key]);
    }

    async function getDataByPage(page) {
        // get data dates range
        if (!dateFrom && !dateTill) {
            await axios
                .get(`${src}NVTK/dates.json?${defaultParams}`)
                .then(function (response) {
                    dateTill = response.data.dates.data[0][1];
                    // dateTill - 3 months
                    dateFrom = new Date(dateTill)
                    dateFrom.setMonth(dateFrom.getMonth() - 3);
                    dateFrom = dateFrom.toLocaleDateString('fr-CA');
                })
        }
        await axios
            .get(`${src}NVTK.json?start=${page * 100}&from=${dateFrom}&till=${dateTill}`)
            .then(function (response) {
                totalItems = response.data['history.cursor'].data[0][1];
                let nextPage = page + 1;
                const newData = response.data.history.data;

                for (const item of newData) {
                    fullData.push(item);
                }

                if (totalItems > fullData.length) {
                    // get all data page by page
                    getDataByPage(nextPage);
                } else {
                    // if data all - draw chart
                    drawHighchart(transformDataForHighcharts(fullData));
                }
            })
    }
    getDataByPage(page);

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
        loaderBlock.classList.remove('active');
        chartBlock.classList.add('active');

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
                            let text = `${this.date.toLocaleDateString('ru-ru', { year: "numeric", month: "short", day: "numeric" })}<br><b>${Highcharts.numberFormat(this.cost, 0)}</b> руб.<br>Объём: ${Highcharts.numberFormat(this.volume, 0)}`
                            return text;
                        }
                    },
                    // styles
                    color: '#1251A0',
                }
            ]
        });
    }
})();