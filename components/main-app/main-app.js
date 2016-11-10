Polymer({
  is: 'main-app',

  observers: [
    'loadPage(route)',
  ],

  ready: function() {
    if (window.location.hash.startsWith('#%21')) {
      window.location.hash = '#!' + window.location.hash.substr(4);
    }
    page('*', function(ctx, next) {
      next();
      setTimeout(function() {
        var hash;
        var match = window.location.hash.match(/\#\w+/);
        if (match != null) {
          hash = match[0];
        }
        if (hash != null) {
          var elem = document.querySelector(hash);
          if (elem == null || elem.offsetTop == 0) {
            return;
          }
          window.scrollTo(0, elem.offsetTop - 100);
        }
      }, 100);
    });
    page.base(window.location.pathname);
    page('/*', (_, next) => {
      this.hideHeader = false;
      this.hideFooter = false;
      next();
    });
    page('/register*', () => { this.route = 'register-form'; });
    page('/sponsors*', () => { this.route = 'sponsor-page'; });
    page('/dayof*', () => {
      this.hideHeader = true;
      this.route = 'dayof-page';
    });
    page('/rsvp/:id/:token/:status', (e) => {
      this.route = 'rsvp-page';
      this.params = e.params;
    });
    page('/select*', () => {
      this.hideHeader = true;
      this.hideFooter = true;
      this.route = 'select-hackers';
    });
    page('/*', () => { this.route = 'index-page'; });
    // 404
    page('*', this.handle404);
    // add #! before urls
    page({hashbang: true});
  },
  loadPage: function(route) {
    const pageURL = 'components/' + route + '/' + route + '.html';
    this.importHref(pageURL, null, this.handle404, true);
  },
  handle404: function() {
    page.redirect('/');
  }
});
