import { Component, OnInit } from '@angular/core';
import * as firebase from 'firebase';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit {

  dev = false;
  share = null;

  lectures: any = {
    speakers: {
      names: [],
      images: {}
    },
    db: {},
    selected: [],
    playing: {
      url: null,
      name: 'loading...'
    }
  }

  music: any = {
    genres: [],
    db: {},
    selected: [],
    playing: {
      url: null,
      genre: 'loading...'
    }
  }

  constructor(public sanitizer: DomSanitizer) {
    if (!window.location.hash) window.location.hash = '///';
    Promise.all([firebase.database().ref('/lectures').once('value').then((snapshot) => {
      this.lectures.selected = Object.keys(snapshot.val());
      this.lectures.db = snapshot.val();
    }), firebase.database().ref('/music').once('value').then((snapshot) => {
      this.music.genres = Object.keys(snapshot.val());
      this.music.selected = Object.keys(snapshot.val());
      this.music.db = snapshot.val();
    }), firebase.database().ref('/speakers').once('value').then((snapshot) => {
      this.lectures.speakers.names = Object.keys(snapshot.val());
      this.lectures.speakers.images = snapshot.val();
    })]).then(() => {
      if (window.location.hash) {
        var hash = window.location.hash.split('/');
        this.newLecture(!this.dev, [hash[0], hash[1]]);
        this.newSong(!this.dev, [hash[2], hash[3]]);
      } else {
        this.newLecture(!this.dev, false);
        this.newSong(!this.dev, false);
      }
    });
  }

  sanitize(url, autoplay) {
    if (autoplay) autoplay = '&autoplay=true';
    else autoplay = '&autoplay=false';
    url = 'https://www.youtube.com/embed/' + url + '?rel=0&showinfo=0' + autoplay;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  newSong(autoplay, selected) {
    var hash = window.location.hash.split('/');
    var genre, url: any;
    if (selected) {
      if (selected[0] && selected[1]) {
        genre = selected[0];
        url = selected[1];
      } else {
        this.newSong(!this.dev, false);
      }
    } else {
      genre = this.music.selected;
      genre = genre[Math.floor(Math.random() * genre.length)];
      url = Object.keys(this.music.db[genre]);
      url = url[Math.floor(Math.random() * url.length)];
    }
    hash[2] = genre;
    this.music.playing.name = genre;
    hash[3] = url;
    if (this.music.db[genre] && this.music.db[genre][url]) {
      url = this.music.db[genre][url].video;
      this.music.playing.url = this.sanitize(this.videoId(url), autoplay);
      window.location.hash = hash.join('/');
      this.share = window.location.href;
    } else {
      this.newSong(!this.dev, false);
    }
  }

  newLecture(autoplay, selected) {
    var hash = window.location.hash.split('/');
    var speaker, url: any;
    if (selected) {
      if (selected[0] && selected[1]) {
        speaker = selected[0].substr(1);
        url = selected[1];
      } else {
        this.newSong(!this.dev, false);
      }
    } else {
      speaker = this.lectures.selected;
      speaker = speaker[Math.floor(Math.random() * speaker.length)];
      url = Object.keys(this.lectures.db[speaker]);
      url = url[Math.floor(Math.random() * url.length)];
    }
    hash[0] = speaker;
    hash[1] = url;
    if (this.lectures.db[speaker] && this.lectures.db[speaker][url]) {
      this.lectures.playing.name = speaker.replace('-', ' ').replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
      url = this.lectures.db[speaker][url].video;
      this.lectures.playing.url = this.sanitize(this.videoId(url), autoplay);
      window.location.hash = hash.join('/');
      this.share = window.location.href;
    } else {
      this.newLecture(!this.dev, false)
    }
  }

  toggle(id, object) {
    var selected = this[object].selected;
    if (selected.length === Object.keys(this[object].db).length) {
      this[object].selected = [id];
      if (object === 'lectures') var elems = this.lectures.speakers.names;
      else var elems = this.music.genres;
      for (let elem of elems) {
        if (id !== elem) document.getElementById(elem).style.opacity = '0.15';
      }
      console.log(id, this.lectures.playing.name.toLowerCase().replace(' ', '-'));
      if (object === 'lectures' && id !== this.lectures.playing.name.toLowerCase().replace(' ', '-')) this.newLecture(true, false);
      else if (object === 'music' && id !== this.music.playing.genre) this.newSong(true, false);
    } else {
      if (selected.indexOf(id) > -1) {
        var index = selected.indexOf(id);
        selected.splice(index, 1);
        document.getElementById(id).style.opacity = '0.15';
      } else {
        selected.push(id);
        document.getElementById(id).style.opacity = '1';
      }
    }
    if (selected.length === 0) {
      if (object === 'lectures') var elems = this.lectures.speakers.names;
      else var elems = this.music.genres;
      this[object].selected = elems;
      for (let elem of elems) {
        document.getElementById(elem).style.opacity = '1';
      }
    }
  }

  videoId(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
  }

  ngOnInit() {
  }

}
