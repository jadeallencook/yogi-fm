/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {
  Component
} from 'react';
import * as firebase from 'firebase';
import YouTube from 'react-native-youtube';
import { YouTubeStandaloneIOS } from 'react-native-youtube';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  StatusBar,
  Image,
  TouchableHighlight
} from 'react-native';

firebaseConfig = {
  apiKey: "AIzaSyAWMXKQMNmdzq1BQzPuSjfeVqqIddH-XfE",
  authDomain: "yoga-ear.firebaseapp.com",
  databaseURL: "https://yoga-ear.firebaseio.com",
  projectId: "yoga-ear",
  storageBucket: "yoga-ear.appspot.com",
  messagingSenderId: "715545961598"
};

export default class App extends Component {
  
  constructor(props) {
    
    super(props);

    this.state = {
      lectures: {
        db: {},
        selected: [],
        playing: {
          url: null,
          name: 'loading...',
          image: ''
        }
      },
      music: {
        genres: [],
        db: {},
        selected: [],
        playing: {
          url: null,
          genre: 'loading'
        }
      },
      speakers: {
        names: [],
        images: {}
      }
    }


    firebase.initializeApp(firebaseConfig);

    Promise.all([firebase.database().ref('/lectures').once('value').then((snapshot) => {
      var selected = Object.keys(snapshot.val()),
        db = snapshot.val();
      this.setState({
        lectures: {
          selected: selected,
          db: db,
          playing: {
            url: null,
            name: 'loading',
            image: ''
          }
        }
      });
    }), firebase.database().ref('/music').once('value').then((snapshot) => {
      this.setState({
        music: {
          genres: Object.keys(snapshot.val()),
          selected: Object.keys(snapshot.val()),
          db: snapshot.val(),
          playing: {
            url: null,
            genre: 'loading'
          }
        }
      });
    }), firebase.database().ref('/speakers').once('value').then((snapshot) => {
      this.setState({
        speakers: {
          names: Object.keys(snapshot.val()),
          images: snapshot.val()
        }
      });
    })]).then(() => {
      this.newLecture();
    });
  }

  newLecture() {
    console.log(this.state);
    var speaker = this.state.lectures.selected;
    speaker = speaker[Math.floor(Math.random() * speaker.length)];
    var image = this.state.speakers.images[speaker].image;
    speaker = speaker.replace('-', ' ').replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    this.setState((prevState) => {
      prevState.lectures.playing.name = speaker;
      prevState.lectures.playing.url = 'www';
      prevState.lectures.playing.image = image;
      return prevState;
    });
  }

  newMusic() {
  }

  componentDidMount() {
    StatusBar.setHidden(true);
    YouTubeStandaloneIOS.playVideo('KVZ-P-ZI6W4')
  .then(() => console.log('Standalone Player Exited'))
  .catch(errorMessage => console.error(errorMessage))
  }

  render() {
    return (
      <View style={styles.container}>
      <YouTube
        videoId='KVZ-P-ZI6W4'
        play={true}
        fullscreen={true}
        loop={true}
        onReady={e => this.setState({ isReady: true })}
        onChangeState={e => this.setState({ status: e.state })}
        onChangeQuality={e => this.setState({ quality: e.quality })}
        onError={e => this.setState({ error: e.error })}
        style={{ alignSelf: 'stretch', height: 100 }}
      />
      <View style={styles.header}>
        <Text style={[styles.text]}>You're listening to</Text>
        <Text style={[styles.text, styles.largeText]}>{ this.state.lectures.playing.name }</Text>
        <Text style={[styles.text]}>with { this.state.music.playing.genre }...</Text>
      </View>
      <View style={styles.videos}>
        <TouchableHighlight style={styles.newButton} onPress={this.newLecture.bind(this)}>
          <Image style={styles.video} source={{uri: this.state.lectures.playing.image }}/>
        </TouchableHighlight>
        <TouchableHighlight style={styles.newButton} onPress={this.newMusic.bind(this)}>
          <Image style={styles.video} source={require('./assets/music.jpg')} />
        </TouchableHighlight>
      </View>
      <Text style={[styles.text, styles.footer]}>Yogi FM | Developed by @jadeallencook</Text>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222',
    flex: 1,
    justifyContent: 'center'
  },
  header: {
    paddingBottom: 20
  },
  text: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 20
  },
  largeText: {
    fontSize: 40
  },
  footer: {
    fontSize: 10,
    marginTop: 20
  },
  videos: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  newButton: {
    borderRadius: 65
  },
  video: {
    backgroundColor: '#CCC',
    height: 130,
    width: 130,
    borderRadius: 65,
    margin: 10
  }
});