const FetchStream = require('fetch').FetchStream,
    fs = require('fs'),
    environment = require('../src/environments/music.environment.json'),
    DomParser = require('dom-parser'),
    music = Object.keys(environment);

console.log(`\nYogi FM | Database CRON\n`);

function extract(string, start, end) {
    string = string.replace(string.substring(0, string.indexOf(start) + start.length, ''));
    string = string.replace(string.substring(string.indexOf(end), string.length));
    string = string.replace('undefined', '');
    string = string.replace('undefined', '');
    return string;
}

music.map(key => {
    genre = environment[key];
    const link = `https://www.youtube.com/playlist?list=${genre.playlist}`;
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
        fs.writeFile('./src/environments/music.environment.json', JSON.stringify(environment), function (err) {
            if (err) return console.log(err);
            else console.log(`${Object.keys(data).length} \t- video(s) added database from playlist!`);
        });
    });
});