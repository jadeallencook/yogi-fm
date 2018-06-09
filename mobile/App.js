/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  StatusBar
} from 'react-native';

type Props = {};
export default class App extends Component<Props> {
  componentDidMount() {
      StatusBar.setHidden(true);
  }
  render() {
    return (
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.text]}>You're listening to</Text>
        <Text style={[styles.text, styles.largeText]}>Alan Watts</Text>
        <Text style={[styles.text]}>with lo-fi...</Text>
      </View>
      <View style={styles.videos}>
        <View style={styles.video}></View>
        <View style={styles.video}></View>
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
  video: {
    backgroundColor: '#CCC',
    height: 125,
    width: 125,
    borderRadius: 100,
    margin: 10
  }
});
