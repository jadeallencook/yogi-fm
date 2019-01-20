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
    this.state = {
      speaker: 'alan-watts',
      lecture: 'XHBKM7mBHUM',
      songs: false,
      genre: 'classic-jazz',
      music: 'QUMuDWDVd20'
    }
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
    if ('ga' in window) {
      window.ga(
        'send', 
        'event', 
        (speakers[this.state.songs] || next) ? 'Lecture' : 'Song', 
        (speakers[this.state.speaker]) ? speakers[this.state.speaker].name : music[this.state.songs].name, 
        id
      );
    }
    if (music[this.state.songs] && !next) {
      const video = document.getElementById('music-video');
      video.setAttribute('src', video.getAttribute('src').replace(this.state.music, id));
    } else {
      const video = document.getElementById('speaker-video');
      video.setAttribute('src', video.getAttribute('src').replace(this.state.lecture, id));
    }
    this.setState({
      speaker: (next) ? this.state.speaker : (speakers[this.state.songs]) ? id : this.state.speaker,
      lecture: (next) ? id : (speakers[this.state.songs]) ? id : this.state.lecture,
      songs: this.state.songs,
      music: (music[this.state.songs] && !next) ? id : this.state.music,
      genre: (music[this.state.songs] && !next) ? this.state.songs : this.state.genre
    });
  }

  random() {
    const speaker = Object.keys(speakers)[Math.floor(Math.random()*Object.keys(speakers).length)];
    const lecture = Object.keys(speakers[speaker].videos)[Math.floor(Math.random()*Object.keys(speakers[speaker].videos).length)];
    const genre = Object.keys(music)[Math.floor(Math.random()*Object.keys(music).length)];
    const song = Object.keys(music[genre].videos)[Math.floor(Math.random()*Object.keys(music[genre].videos).length)];
    this.setState({
      songs: false,
      speaker: speaker,
      lecture: lecture,
      music: song,
      genre: genre
    })
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
          ? <Songs speaker={this.state.songs} play={this.play.bind(this)} /> 
          : <Browse open={this.open.bind(this)} options={this.state} /> 
        }
      </div>
    );
  }
}

export default App;
