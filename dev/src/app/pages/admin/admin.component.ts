import { Component, OnInit } from '@angular/core';
import * as firebase from 'firebase';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  admin:any;

  constructor() {
    firebase.auth().onAuthStateChanged((user) => {
      this.admin = user;
    });
  }

  ngOnInit() {
  }

}
