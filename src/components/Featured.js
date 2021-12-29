import React, { useContext } from 'react';
import './Featured.scss';
import AppContext from '../context/AppContext';
import { Link } from 'react-router-dom';

const Section = ({ group }) => {
  const { speakers } = useContext(AppContext);
  return (
    <div>
      <span className='title'>{group.text}</span>
      <div className='collection'>
        {group.speakers.map((key) => {
          const speaker = speakers[key];
          return !speaker ? null : (
            <Link to={`/speaker/${key}`} key={key}>
              <div
                style={{
                  backgroundImage: `url(${speaker.avatar.url})`,
                }}
              />
              <span className='name'>{speaker.name[0].text}</span>
              <span className='years'>
                {new Date(speaker.dob).getFullYear()}-
                {!speaker.dod ? 'Now' : new Date(speaker.dod).getFullYear()}
              </span>
            </Link>
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
