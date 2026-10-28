
    import React, { Component } from 'react';
    import speakers from '../environments/speakers.environment.json';
    import music from '../environments/music.environment.json';
    import './Banner.scss';

    class Banner extends Component {
        render() {
            return (this.props.options.speaker) 
            ? <div className="Banner" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/assets/images/banner.jpg)` }}>
                You're listening to
                <h2 className="animated flipInX" style={{ animationDelay: '100ms' }}>{
                    (this.props.options.speaker) 
                    ? speakers[this.props.options.speaker].name
                    : null
                }</h2>
                {
                    (this.props.options.music) 
                    ? `with ${music[this.props.options.genre].name.toLowerCase()}...`
                    : 'try choosing some music!'
                }
            </div>
            : <div className="Banner" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/assets/images/banner.jpg)` }}>
                Welcome to
                <h2>Yogi FM</h2>
                click a speaker to get started...
            </div>
        }
    }

    export default Banner;
    