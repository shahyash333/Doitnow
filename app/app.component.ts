import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    const splash = document.getElementById('app-splash');
    if (!splash) return;

    splash.classList.add('app-splash--hide');

    window.setTimeout(() => {
      splash.remove();
    }, 250);
  }
}
