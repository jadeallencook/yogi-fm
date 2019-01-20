import React, { Component } from 'react';
import speakers from '../environments/speakers.environment.json';
import music from '../environments/music.environment.json';
import './Songs.scss';

class Songs extends Component {
    render() {
        const lecture = (speakers[this.props.speaker])
        const section = (lecture) ? speakers[this.props.speaker] : music[this.props.speaker];
        return (
            <div className="Songs">
                {
                    (lecture) ?
                    <div className="cover animated fadeIn">
                        <div className="image" style={{
                            backgroundImage: `url(${section.image})`
                        }}></div>
                        <div className="bio">
                            <h2>{section.name}</h2>
                            <span>{section.bio}</span>
                        </div>
                    </div> 
                    : 
                    <div className="music-cover animated fadeInDown">
                        <h2>{section.name}</h2>
                    </div>

                }
                <div className="titles animated fadeIn">
                    <div><b>Lecture Title</b></div>
                    <div><b>{(lecture) ? 'Speaker' : 'Genre'}</b></div>
                </div>
                {
                    Object.keys(section.videos).map((key, i) => {
                        const song = section.videos[key];
                        return(
                            <div 
                                key={key} 
                                className="song animated fadeInUp"
                                style={{
                                    animationDelay: `${(i*100)}ms`
                                }}
                                onClick={() => {
                                    this.props.play(key);
                                }}>
                                <div>{song}</div>
                                <div>{section.name}</div>
                            </div>
                        );
                    })
                }
            </div>
        )
    }
}

export default Songs;
