import React, { useContext } from 'react';
import './Sidebar.scss';
import AppContext from '../context/AppContext';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  const { speakers } = useContext(AppContext);
  return (
    <div className='Sidebar animated slideInLeft'>
      <h2>Yogi FM</h2>
      <span className='link' onClick={null}>
        <Link to='/'>Home</Link>
      </span>
      <form
        action='https://www.paypal.com/cgi-bin/webscr'
        method='post'
        target='_blank'
      >
        <input type='hidden' name='cmd' value='_s-xclick' />
        <input type='hidden' name='hosted_button_id' value='RKQ42R5GQ42RA' />
        <input type='submit' border='0' name='submit' value='Donate' />
      </form>
      <br />
      <span className='title'>SPEAKERS</span>
      {Object.keys(speakers).map((id, index) => {
        const { name } = speakers[id];
        return (
          <span className='link' key={id}>
            <Link key={id} to={`/speaker/${id}`}>
              {name[0].text}
            </Link>
          </span>
        );
      })}
      <br />
      <span className='footer'>
        <b>Yogi FM</b> | Copyright 2019
      </span>
      <span className='footer'>
        Developed By{' '}
        <b>
          <a
            href='https://github.com/jadeallencook'
            rel='noopener noreferrer'
            target='_blank'
          >
            @jadeallencook
          </a>
        </b>
      </span>
    </div>
  );
};

export default Sidebar;
