// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  business: 'Yoga Ear',
  speakers: [{
    name: 'Alan Watts',
    slug: 'alan-watts'
  }, {
    name: 'Aldous Huxley',
    slug: 'aldous-huxley'
  }, {
    name: 'Buckminster Fuller',
    slug: 'buckminster-fuller'
  }, {
    name: 'Ram Dass',
    slug: 'ram-dass'
  }, {
    name: 'Timothy Leary',
    slug: 'timothy-leary'
  }, {
    name: 'Terence McKenna',
    slug: 'terence-mckenna'
  }, {
    name: 'Joseph Campbell',
    slug: 'joseph-campbell'
  }, {
    name: 'Sadhguru',
    slug: 'sadhguru'
  }],
  genres: [{
    type: 'Jazz Vibes',
    slug: 'jazz-vibes',
  }, {
    type: 'Classic Jazz',
    slug: 'classic-jazz'
  }, {
    type: 'Indian',
    slug: 'indian'
  }, {
    type: 'Chinesse',
    slug: 'chinese'
  }, {
    type: 'Japanese',
    slug: 'japanese'
  }, {
    type: 'Rock',
    slug: 'rock'
  }, {
    type: 'Inspirational',
    slug: 'inspirational'
  }, {
    type: 'Lo-Fi',
    slug: 'lo-fi'
  }, {
    type: 'Classical',
    slug: 'classical'
  }, {
    type: 'Tibetan',
    slug: 'tibetan'
  }],
  firebase: {
    config: {
      apiKey: "AIzaSyAWMXKQMNmdzq1BQzPuSjfeVqqIddH-XfE",
      authDomain: "yoga-ear.firebaseapp.com",
      databaseURL: "https://yoga-ear.firebaseio.com",
      projectId: "yoga-ear",
      storageBucket: "",
      messagingSenderId: "715545961598"
    }
  }
};
