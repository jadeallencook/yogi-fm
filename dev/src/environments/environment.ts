// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
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
