import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import * as firebase from 'firebase';
import { environment } from '../environments/environment';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { SplashComponent } from './pages/splash/splash.component';
import { SearchComponent } from './components/search/search.component';
import { PlayerComponent } from './components/player/player.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './components/login/login.component';
import { AddVideoComponent } from './components/add-video/add-video.component';

const appRoutes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'search/:critera', component: SearchComponent },
  { path: '**', component: SplashComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    SplashComponent,
    SearchComponent,
    PlayerComponent,
    AdminComponent,
    LoginComponent,
    AddVideoComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(appRoutes),
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor() {
    firebase.initializeApp(environment.firebase.config);
  }
}
