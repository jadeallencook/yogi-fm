import React, { Component } from 'react';
import speakers from './environments/speakers.environment.json';
import genres from './environments/genres.environment.json';
import './App.scss';

class App extends Component {
  constructor() {
    super();
    this.state = {
      speaker: null,
      genre: null
    }
  }

  componentDidMount() {
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '').split('/');
      if (
        Object.keys(speakers).indexOf(hash[0]) !== -1 &&
        Object.keys(genres).indexOf(hash[1]) !== -1 
      ) {
        this.setState({
          speaker: hash[0],
          genre: hash[1]
        });
      } else {
        this.loadRandomSet();
      }
    } else {
      this.loadRandomSet();
    }
  }

  loadRandomSet() {
    this.setState({
      speaker: Object.keys(speakers)[0],
      genre: Object.keys(genres)[0]
    });
  }

  shouldComponentUpdate() {
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '').split('/');
      if (
        Object.keys(speakers).indexOf(hash[0]) !== -1 &&
        Object.keys(genres).indexOf(hash[1]) !== -1 
      ) return true;
    } else {
      return false;
    }
  }

  componentDidUpdate() {
    window.location.hash = `${this.state.speaker}/${this.state.genre}`;
  }

  render() {
    return (
      <div className="App">
          {
            (this.state.speaker && this.state.genre) ?
            <h1>
              You're listening too
              <span>{this.state.speaker.replace('-', ' ')}</span>
              with {this.state.genre.replace('-', ' ')}...
            </h1> : <h1>Loading...</h1>
          }
          <iframe title="speaker" width="400" height="225" src={`https://www.youtube.com/embed/videoseries?list=${speakers[this.state.speaker]}&autoplay=1`} frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"></iframe>
          <iframe title="music" width="400" height="225" src={`https://www.youtube.com/embed/videoseries?list=${genres[this.state.genre]}&autoplay=1`} frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"></iframe>
          <div className="speakers">
            {
              Object.keys(speakers).map(speaker => {
                return <div key={speaker} style={{
                  backgroundImage: `url(assets/images/${speaker}.png)`,
                  opacity: (this.state.speaker === speaker) ? '0.5' : '1'
                }} onClick={() => {
                  this.setState({
                    ...this.state,
                    speaker: speaker
                  });
                }}></div>
              })
            }
          </div>
          <div className="music">
            {
              Object.keys(genres).map(genre => {
                return <div key={genre} style={{
                  opacity: (this.state.genre === genre) ? '0.5' : '1'
                }} onClick={() => {
                  this.setState({
                    ...this.state,
                    genre: genre
                  });
                }}>{genre.replace('-', ' ')}</div>
              })
            }
          </div>
          <span className="footer">Yogi FM | Developed by <a target="_blank" rel="noopener noreferrer" href="https://github.com/jadeallencook">@jadeallencook</a></span>
      </div>
    );
  }
}

export default App;
