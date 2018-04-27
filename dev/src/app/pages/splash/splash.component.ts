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
      this.newLecture(true);
      this.newSong(true);
    });
  }

  sanitize(url, autoplay) {
    if (autoplay) autoplay = '&autoplay=true';
    else autoplay = '&autoplay=false';
    url = 'https://www.youtube.com/embed/' + url + '?rel=0&showinfo=0' + autoplay;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  newSong(autoplay) {
    var genre = this.music.selected;
    genre = genre[Math.floor(Math.random() * genre.length)];
    this.music.playing.name = genre;
    var url: any = Object.keys(this.music.db[genre]);
    url = url[Math.floor(Math.random() * url.length)];
    url = this.music.db[genre][url].video;
    this.music.playing.url = this.sanitize(this.videoId(url), autoplay);
  }

  newLecture(autoplay) {
    var speaker = this.lectures.selected;
    speaker = speaker[Math.floor(Math.random() * speaker.length)];
    this.lectures.playing.name = speaker.replace('-', ' ').replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    var url: any = Object.keys(this.lectures.db[speaker]);
    url = url[Math.floor(Math.random() * url.length)];
    url = this.lectures.db[speaker][url].video;
    this.lectures.playing.url = this.sanitize(this.videoId(url), autoplay);
  }

  toggle(id, object) {
    var selected = this[object].selected;
    if (selected.indexOf(id) > -1) {
      var index = selected.indexOf(id);
      selected.splice(index, 1);
      document.getElementById(id).style.opacity = '0.15';
    } else {
      selected.push(id);
      document.getElementById(id).style.opacity = '1';
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
