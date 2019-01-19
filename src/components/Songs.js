import React, { Component } from 'react';
import speakers from '../environments/speakers.environment.json';
import './Songs.scss';

class Songs extends Component {
    render() {
        const speaker = speakers[this.props.speaker];
        return (
            <div className="Songs">
                <div className="cover">
                    <div className="image" style={{
                        backgroundImage: `url(${speaker.image})`
                    }}></div>
                    <div className="bio">
                        <h2>{speaker.name}</h2>
                        <span>{speaker.bio}</span>
                    </div>
                </div>
                <div className="song">
                    <div><b>Lecture Title</b></div>
                    <div><b>Speaker</b></div>
                </div>
                {
                    Object.keys(speaker.videos).map(key => {
                        const song = speaker.videos[key];
                        return(
                            <div 
                                key={key} 
                                className="song"
                                onClick={() => {
                                    this.props.play(key);
                                }}>
                                <div>{song}</div>
                                <div>{speaker.name}</div>
                            </div>
                        );
                    })
                }
            </div>
        )
    }
}

export default Songs;
