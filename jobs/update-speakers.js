const FetchStream = require('fetch').FetchStream,
    fs = require('fs'),
    environment = require('../src/environments/speakers.environment.json'),
    DomParser = require('dom-parser'),
    speakers = Object.keys(environment);

function extract(string, start, end) {
    string = string.replace(string.substring(0, string.indexOf(start) + start.length, ''));
    string = string.replace(string.substring(string.indexOf(end), string.length));
    string = string.replace('undefined', '');
    string = string.replace('undefined', '');
    return string;
}

speakers.map(key => {
    speaker = environment[key];
    const link = `https://www.youtube.com/playlist?list=${speaker.playlist}`;
    let html = '';
    new Promise(res => {
        new FetchStream(link).on('data', chunk => {
            chunk = chunk.toString();
            html += chunk;
            if (chunk.indexOf('</html>') !== -1) res();
        });
    }).then(() => {
        const dom = new DomParser().parseFromString(html);
        data = {};
        dom.getElementsByClassName('pl-video-title-link').map((node, i) => {
            let title = node.innerHTML.trim();
            title = title.trim();
            data[extract(node.getAttribute('href'), 'v=', '&amp')] = title;
        });
        environment[key].videos = data;
        fs.writeFile('./src/environments/speakers.environment.json', JSON.stringify(environment), function (err) {
            if (err) return console.log(err);
            else console.log(`SUCCESS:\t${Object.keys(data).length} \tlecture video(s) added!`);
        });
    });
});