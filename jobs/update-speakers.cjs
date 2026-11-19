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

function filter(string, speaker) {
    speaker = speaker.toLowerCase();
    string = string.trim();
    string = string.toLowerCase();
    string = string
        .replace(`${speaker} :`, '')
        .replace(`${speaker} -`, '')
        .replace(`${speaker} |`, '')
        .replace(`${speaker} ~`, '')
        .replace(`${speaker}:`, '')
        .replace(`${speaker}-`, '')
        .replace(`${speaker}|`, '')
        .replace(`${speaker}~`, '')
        .replace('&#39;', '\'')
        .replace('&#39;', '\'')
        .replace('&amp;', '&')
        .replace('&quot;', '"')
        .replace('&quot;', '"')
        .replace('.flv', '"')
        .replace('bbc', 'BBC')
        .trim();
    return string;
}

function scrape(url) {
    return new Promise(res => {
        let html = '';
        new FetchStream(url).on('data', chunk => {
            chunk = chunk.toString();
            html += chunk;
            if (chunk.indexOf('</html>') !== -1) res(html);
        });
    });
}

function write(speaker, num) {
    fs.writeFile('./src/environments/speakers.environment.json', JSON.stringify(environment), function (err) {
        if (err) return console.log(err);
        else console.log(`${num} video(s)\t\t${speaker.name}`);
    });
}

speakers.map(key => {
    scrape(`https://www.youtube.com/playlist?list=${environment[key].playlist}`).then((html) => {
        const speaker = environment[key];
        const dom = new DomParser().parseFromString(html);
        data = {};
        dom.getElementsByClassName('pl-video-title-link').map((node, i) => {
            let title = node.innerHTML.trim();
            title = filter(title, speaker.name);
            data[extract(node.getAttribute('href'), 'v=', '&amp')] = title;
        });
        environment[key].videos = data;
        write(speaker, Object.keys(data).length);
    });
});