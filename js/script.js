const chartBlock = document.querySelector('.js-chart');
const loaderBlock = document.querySelector('.js-loader');

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

// get data dates range
Highcharts.getJSON(`${src}NVTK/dates.json?${defaultParams}`, (data) => {
    dateFrom = data.dates.data[0][0];
    dateTill = data.dates.data[0][1];
});

// axios
//     .get(`${src}NVTK.json`)
//     .then(function (response) {
//         console.log(response.data)
//     })

async function getDataByPage(page) {
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
    console.log(transformedData);
    return transformedData;
}

function drawHighchart(data) {
    loaderBlock.classList.remove('active');
    chartBlock.classList.add('active');

    Highcharts.stockChart('chart', {
        rangeSelector: {
            selected: 2,
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
                width: 0
            }],
            buttonTheme: {
                paddingLeft: 10,
                paddingTop: 5,
                paddingRight: 10,
                paddingbottom: 5,
                width: 'auto',
            }
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
            positioner: function (width, height, point) {
                let chart = this.chart;
                let position;
                if (point.isHeader) {
                    position = {
                        x: Math.max(
                            chart.plotLeft,
                            Math.min(
                                point.plotX + chart.plotLeft - width / 2,
                                chart.chartWidth - width - chart.marginRight
                            )
                        ),
                        y: point.plotY
                    };
                } else {
                    position = {
                        x: point.series.chart.plotLeft,
                        y: point.series.yAxis.top - chart.plotTop
                    };
                }
                return position;
            }
        },

        yAxis: [
            {
                title: {
                    text: 'NVTK'
                },
                height: '80%',
                lineWidth: 1,
                resize: {
                    enabled: true
                },
            },
            {
                title: {
                    text: 'Volume'
                },
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
                name: 'NVTK',
                data: data.data,
                turboThreshold: 5000,
                tooltip: {
                    pointFormatter: function () {
                        let text = `
                            <div> <b>Открытие</b>: ${Highcharts.numberFormat(this.open, 0)} </div>
                            <div> <b>Закрытие</b>: ${Highcharts.numberFormat(this.close, 0)} </div>
                            <div> <b>Max</b>: ${Highcharts.numberFormat(this.high, 0)} </div>
                            <div> <b>Min</b>: ${Highcharts.numberFormat(this.low, 0)} </div>
                        `
                        return text;
                    }
                },
            },
            // volumes graph
            {
                type: 'column',
                name: 'Volume',
                data: data.volume,
                turboThreshold: 0,
                yAxis: 1,
                pointWidth: 1,
                tooltip: {
                    pointFormatter: function () {
                        return `<b>Объём</b> (акции): ${Highcharts.numberFormat(this.y, 0)}`;
                    }
                },
            }
        ]
    });
}