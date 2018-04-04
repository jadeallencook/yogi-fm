import { Component, OnInit } from '@angular/core';
import * as firebase from 'firebase';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-video',
  templateUrl: './add-video.component.html',
  styleUrls: ['./add-video.component.scss']
})
export class AddVideoComponent implements OnInit {

  genre: string = '';
  speaker: string = '';
  image: string = '';
  title: string = '';
  video: string = '';
  keywords: string = '';
  error: string = '';
  success: string = '';

  type: string = '';
  speakers: Array<Object>;

  constructor() {
    this.speakers = environment.speakers;
  }

  resetValues() {
    for (let key of Object.keys(this)) {
      if (key !== 'type' && key !== 'speakers') this[key] = '';
    }
  }

  successMessage(message) {
    this.success = message;
    let alert = setTimeout(() => {
      this.success = '';
      clearTimeout(alert);
    }, 3000);
  }

  errorMessage(message) {
    this.error = message;
    let alert = setTimeout(() => {
      this.error = '';
      clearTimeout(alert);
    }, 3000);
  }

  addMusic() {
    if (!this.genre) {
      this.errorMessage('No genre was selected...');
    } else if (!this.video) {
      this.errorMessage('You forgot the video link...');
    } else {
      const ref = firebase.database().ref('/music/' + this.genre);
      let videoExists = false;
      ref.once('value').then((snapshot) => {
        if (snapshot.val()) {
          for (let music of Object.keys(snapshot.val())) {
            if (snapshot.val()[music].video === this.video) videoExists = true;
          }
        }
        if (videoExists) {
          this.errorMessage('Music has already been added...');
        } else {
          ref.push({
            video: this.video
          }).then(() => {
            this.resetValues();
            this.successMessage('Music successfully added!');
          });
        }
      });
    }
  }

  addLecture() {
    const keywords = this.keywords.split(', ');
    if (!this.speaker) {
      this.errorMessage('No speaker was selected...');
    } else if (!this.title || !this.video || !this.keywords) {
      this.errorMessage('There are missing fields...');
    } else {
      const ref = firebase.database().ref('/lectures/' + this.speaker);
      let videoExists = false;
      ref.once('value').then((snapshot) => {
        if (snapshot.val()) {
          for (let lecture of Object.keys(snapshot.val())) {
            if (snapshot.val()[lecture].video === this.video) videoExists = true;
          }
        }
        if (videoExists) {
          this.errorMessage('Video has already been added...');
        } else {
          ref.push({
            title: this.title,
            video: this.video,
            keywords: keywords
          }).then(() => {
            this.resetValues();
            this.successMessage('Lecture successfully added!');
          });
        }
      });
    }
  }

  updateSpeaker() {
    if (!this.speaker) {
      this.errorMessage('No speaker was selected...');
    } else if (!this.image) {
      this.errorMessage('You forgot to add an image...');
    } else {
      firebase.database().ref('/speakers/' + this.speaker).push({
        image: this.image
      }).then(() => {
        this.resetValues();
        this.successMessage('Speaker successfully updated!');
      });
    }
  }

  ngOnInit() {
  }

}
