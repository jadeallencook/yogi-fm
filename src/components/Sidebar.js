import React, { Component } from 'react';
import './Sidebar.scss';
import speakers from '../environments/speakers.environment.json';
import music from '../environments/music.environment.json';

class Sidebar extends Component {
    render() {
        return (
            <div className="Sidebar animated slideInLeft">
                <h2 onClick={this.props.home}>Yogi FM</h2>
                <span className="link" onClick={this.props.home}>Home</span>
                <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                    <input type="hidden" name="cmd" value="_s-xclick" />
                    <input type="hidden" name="hosted_button_id" value="RKQ42R5GQ42RA" />
                    <input type="submit" border="0" name="submit" value="Donate" />
                </form>
                <span className="link" onClick={this.props.random}>Random</span>
                <br />
                <span className="title">SPEAKERS</span>
                {
                    Object.keys(speakers).map(key => {
                        const speaker = speakers[key];
                        return (
                            <span 
                                className="link" 
                                key={key}
                                onClick={() => {
                                    this.props.open(key);
                                }}>
                                {speaker.name}
                            </span>
                        )
                    })
                }
                <br />
                <span className="title">MUSIC</span>
                {
                    Object.keys(music).map(key => {
                        const genre = music[key];
                        return (
                            <span 
                                className="link" 
                                key={key}
                                onClick={() => {
                                    this.props.open(key);
                                }}>
                                {genre.name}
                            </span>
                        )
                    })
                }
                <br />
                <span className="footer"><b>Yogi FM</b> | Copyright 2019</span>
                <span className="footer">Developed By <b><a href="https://github.com/jadeallencook" rel="noopener noreferrer" target="_blank">@jadeallencook</a></b></span>
            </div>
        )
    }
}

export default Sidebar;
