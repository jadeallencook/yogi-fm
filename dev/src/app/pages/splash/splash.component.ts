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

  playing: any = '';
  music: any = '';
  featured: string = '';
  speaker: string = '';
  speakers: Array<string> = [];

  constructor(public sanitizer: DomSanitizer) {
    this.getVideo(false);
    this.getMusic(false);
  }

  getMusic(autoplay) {
    firebase.database().ref('/music').once('value').then((snapshot) => {
      const genres = Object.keys(snapshot.val());
      const genre = genres[Math.floor(Math.random() * genres.length)];
      const uids = Object.keys(snapshot.val()[genre]);
      const uid = uids[Math.floor(Math.random() * uids.length)];
      const id = this.getYouTubeVideoId(snapshot.val()[genre][uid].video);
      console.log(id);
      if (autoplay) autoplay = '&autoplay=true';
      else autoplay = '&autoplay=false';
      const url = 'https://www.youtube.com/embed/' + id + '?rel=0&showinfo=0' + autoplay;
      this.music = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });
  }

  getVideo(autoplay) {
    firebase.database().ref('/lectures').once('value').then((snapshot) => {
      this.speakers = Object.keys(snapshot.val());
      const randomSpeaker = this.speakers[Math.floor(Math.random() * this.speakers.length)];
      for (let speaker of environment.speakers) {
        if (speaker.slug === randomSpeaker) this.speaker = speaker.name;
      }
      const uids = Object.keys(snapshot.val()[randomSpeaker]);
      const uid = uids[Math.floor(Math.random() * uids.length)];
      this.featured = this.getYouTubeVideoId(snapshot.val()[randomSpeaker][uid].video);
      if (autoplay) autoplay = '&autoplay=true';
      else autoplay = '&autoplay=false';
      const url = 'https://www.youtube.com/embed/' + this.featured + '?rel=0&showinfo=0' + autoplay;
      this.playing = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });
  }

  getYouTubeVideoId(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
  }

  ngOnInit() {
  }

}
