import React, { Component } from 'react';
import './Featured.scss';
import featured from '../environments/featured.environment.json';
import speakers from '../environments/speakers.environment.json';

class Section extends Component {
    render() {
        return (
            <div>
                <span className="title">{this.props.selection.title}</span>
                <div className="collection">
                    {
                        this.props.selection.speakers.map(key => {
                            const speaker = speakers[key];
                            return (
                                <div key={key}>
                                    <div style={{
                                        backgroundImage: `url(${speaker.image})`
                                    }} onClick={() => {
                                        this.props.open(key);
                                    }}></div>
                                    <span className="name">{speaker.name}</span>
                                    <span className="years">{speaker.years}</span>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        )
    }
}

class Featured extends Component {
    render() {
        return (
            <div className="Featured">
                <Section selection={featured.self} open={this.props.open} />
                <Section selection={featured.drugs} open={this.props.open} />
                <Section selection={featured.east} open={this.props.open} />
                <Section selection={featured.relationships} open={this.props.open} />
            </div>
        )
    }
}

export default Featured;
