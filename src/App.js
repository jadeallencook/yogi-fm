import React, { Component } from 'react';
import './App.scss';

import Sidebar from './components/Sidebar';
import Browse from './components/Browse';
import Player from './components/Player';
import Songs from './components/Songs';

class App extends Component {
  constructor() {
    super();
    this.state = {
      speaker: null,
      lecture: null,
      songs: false
    }
  }

  open(speaker) {
    this.setState({
      songs: speaker,
      speaker: this.state.speaker,
      lecture: this.state.lecture
    });
  }

  home() {
    this.setState({
      speaker: this.state.speaker,
      lecture: this.state.lecture,
      songs: false
    });
  }

  play(lecture) {
    this.setState({
      speaker: this.state.songs,
      lecture: lecture,
      songs: this.state.songs
    });
  }

  render() {
    return (
      <div className="App">
        <Player speaker={this.state.speaker} video={this.state.lecture} />
        <Sidebar lecture={this.state.lecture} home={this.home.bind(this)} open={this.open.bind(this)} />
        { 
          (this.state.songs) 
          ? <Songs speaker={this.state.songs} play={this.play.bind(this)} /> 
          : <Browse open={this.open.bind(this)} speaker={this.state.speaker} /> 
        }
      </div>
    );
  }
}

export default App;
