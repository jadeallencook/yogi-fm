import React, { Component } from 'react';
import speakers from '../environments/speakers.environment.json';
import music from '../environments/music.environment.json';
import './Songs.scss';

class Songs extends Component {
    render() {
        const lecture = (speakers[this.props.options.songs]);
        const section = (lecture) ? speakers[this.props.options.songs] : music[this.props.options.songs];
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
                            <span className="years">{section.years}</span>
                            <div className="books">
                            {
                                (section.books.length > 0 ) ? function(a) {
                                    // randomize book results
                                    for (let i = a.length - 1; i > 0; i--) {
                                        const j = Math.floor(Math.random() * (i + 1));
                                        [a[i], a[j]] = [a[j], a[i]];
                                    }
                                    return a;
                                }(section.books).map((book, i) => {
                                    return (
                                        <a 
                                            className="book animated fadeIn" 
                                            key={book.title} 
                                            style={{
                                                backgroundImage: `url(${book.image})`,
                                                animationDelay: `${i * 100}ms`
                                            }}
                                            href={book.link}
                                            target="_blank"
                                        ></a>
                                    )
                                }) : null
                            }
                            </div>
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
                                className={`song animated fadeIn ${
                                    (
                                        key === this.props.options.lecture ||
                                        key === this.props.options.music
                                    ) ? 'active' : ''
                                }`}
                                style={{
                                    animationDelay: `${(i*50)}ms`
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
