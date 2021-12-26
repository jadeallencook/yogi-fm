import React, { useContext } from 'react';
import './Featured.scss';
import AppContext from '../context/AppContext';

const Section = ({ group }) => {
  const { speakers } = useContext(AppContext);
  return (
    <div>
      <span className='title'>{group.text}</span>
      <div className='collection'>
        {group.speakers.map((key) => {
          const speaker = speakers[key];
          return !speaker ? null : (
            <div key={key}>
              <div
                style={{
                  backgroundImage: `url(${speaker.avatar.url})`,
                }}
                onClick={() => {
                  this.props.open(key);
                }}
              />
              <span className='name'>{speaker.name[0].text}</span>
              <span className='years'>{speaker.dob}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Featured = () => {
  const { featured } = useContext(AppContext);

  return (
    <div className='Featured'>
      {featured.map((group, index) => {
        return <Section group={group} key={`featured-${index}`} />;
      })}
    </div>
  );
};

export default Featured;
