
// Highcharts.getJSON('https://demo-live-data.highcharts.com/aapl-c.json', function (data) {

//     console.log('AAPL', data)
//     // Create the chart
//     Highcharts.stockChart('container', {
//         rangeSelector: {
//             selected: 2
//         },

//         title: {
//             text: 'AAPL Stock Price'
//         },

//         series: [{
//             name: 'AAPL',
//             data: data,
//             tooltip: false
//         }]
//     });
// });

// ---------------------------------------------------------------------------------

const chartBlock = document.querySelector('.js-chart');
const loaderBlock = document.querySelector('.js-loader');

const src = 'https://iss.moex.com/iss/history/engines/stock/markets/shares/securities/';

let fullData = [];
let dateFrom = null;
let dateTill = null;

let board = 'tqbr';
let total = null;
let page = 0;
let itemsPerPage = 100;
let totalItems = null;
let pages = null;

let queryParams = new URLSearchParams();
// 
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
    dateFrom = data.dates.data[0];
    dateTill = data.dates.data[1];
});

dateParams = {
    'from': dateFrom,
    'till': dateTill,
}
for (let key in dateParams) {
    queryParams.append(key, dateParams[key]);
}

axios
    .get(`${src}NVTK.json`)
    .then(function (response) {
        console.log(response.data)
    })

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
                getDataByPage(nextPage);
            } else {
                drawHighchart(transformDataForHighcharts(fullData));
            }
        })
}

getDataByPage(page);

function transformDataForHighcharts(data) {
    let transformedData = [];
    for (const item of data) {
        if (!!item[11]) {
            transformedData.push(
                [
                    // date col
                    new Date(item[1]).getTime(),
                    // cost
                    item[11]
                ]
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
            selected: 2
        },

        series: [{
            name: 'NVTK',
            data: data,
            tooltip: false
        }]
    });
}