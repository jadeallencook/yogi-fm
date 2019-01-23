import React, { Component } from 'react';
import './App.scss';

import speakers from './environments/speakers.environment.json';
import music from './environments/music.environment.json';

import Sidebar from './components/Sidebar';
import Browse from './components/Browse';
import Player from './components/Player';
import Songs from './components/Songs';

class App extends Component {
  /*
    Lectures {
      speaker: key
      lecture: id
    }
    Music {
      genre: key
      music: id
    }
  */
  constructor() {
    super();
    let hash = window.location.hash;
    hash = hash.replace('#', '');
    hash = hash.split('/');
    const passed = (hash.length === 4);
    const speaker = (passed && speakers[hash[0]]) ? hash[0] : 'alan-watts';
    const lecture = (passed && speakers[hash[0]] && speakers[hash[0]].videos[hash[1]]) ? hash[1] : 'XHBKM7mBHUM';
    const genre = (passed && music[hash[2]]) ? hash[2] : 'classic-jazz';
    const song = (passed && music[hash[2]] && music[hash[2]].videos[hash[3]]) ? hash[3] : 'QUMuDWDVd20';
    window.location.hash = `${speaker}/${lecture}/${genre}/${song}`;
    this.state = {
      speaker: speaker,
      lecture: lecture,
      songs: false,
      genre: genre,
      music: song
    }
  }

  componentDidUpdate() {
    window.location.hash = `${this.state.speaker}/${this.state.lecture}/${this.state.genre}/${this.state.music}`;
  }

  open(section) {
    this.setState({
      songs: section,
      speaker: this.state.speaker,
      lecture: this.state.lecture,
      music: this.state.music,
      genre: this.state.genre
    });
  }

  home() {
    this.setState({
      songs: false,
      speaker: this.state.speaker,
      lecture: this.state.lecture,
      music: this.state.music,
      genre: this.state.genre
    });
  }

  play(id, next) {
    const lecture = (
      next || (
        speakers[this.state.songs] && 
        speakers[this.state.songs].videos[id].length
      )
    );
    if ('ga' in window) {
      const type = (lecture) ? 'lecture' : 'song';
      const speaker = (lecture) ? 
        (lecture && !next) ? 
          this.state.songs : 
          this.state.speaker
        : (!lecture) ? 
          this.state.songs : 
          this.state.genre;
      window['ga']('event', type, speaker, id, {
        hitCallback: () => {
          console.log(`${type} (${id}) played by ${speaker}`);
        }
      });
    }
    if (music[this.state.songs] && !next) {
      const video = document.getElementById('music-video');
      video.setAttribute('src', video.getAttribute('src').replace(this.state.music, id));
    } else {
      const video = document.getElementById('speaker-video');
      video.setAttribute('src', video.getAttribute('src').replace(this.state.lecture, id));
    }
    this.setState({
      speaker: (lecture && !next) ? this.state.songs : this.state.speaker,
      lecture: (lecture) ? id : this.state.lecture,
      songs: this.state.songs,
      music: (!lecture) ? id : this.state.music,
      genre: (!lecture) ? this.state.songs : this.state.genre
    });
  }

  random() {
    const speaker = Object.keys(speakers)[Math.floor(Math.random()*Object.keys(speakers).length)];
    const lecture = Object.keys(speakers[speaker].videos)[Math.floor(Math.random()*Object.keys(speakers[speaker].videos).length)];
    const genre = Object.keys(music)[Math.floor(Math.random()*Object.keys(music).length)];
    const song = Object.keys(music[genre].videos)[Math.floor(Math.random()*Object.keys(music[genre].videos).length)];
    let video = document.getElementById('music-video');
    video.setAttribute('src', video.getAttribute('src').replace(this.state.music, song));
    video = document.getElementById('speaker-video');
    video.setAttribute('src', video.getAttribute('src').replace(this.state.lecture, lecture));
    this.setState({
      songs: false,
      speaker: speaker,
      lecture: lecture,
      music: song,
      genre: genre
    });
  }

  render() {
    return (
      <div className="App">
        <Player options={this.state} play={this.play.bind(this)} />
        <Sidebar 
          lecture={this.state.lecture} 
          home={this.home.bind(this)} 
          open={this.open.bind(this)}
          random={this.random.bind(this)} />
        { 
          (this.state.songs) 
          ? <Songs options={this.state} play={this.play.bind(this)} /> 
          : <Browse open={this.open.bind(this)} options={this.state} /> 
        }
      </div>
    );
  }
}

export default App;
