// Gesture events like tap and track generated from touch will not be
// preventable, allowing for better scrolling performance.
Polymer.setPassiveTouchGestures(true)

class MainApp extends Polymer.Element {
  static get is () { return 'main-app' }

  static get properties () {
    return {
      page: {
        type: String,
        observer: '_pageChanged'
      },
      loading: {
        type: Boolean,
        value: true
      },
      routeData: Object,
      subRoute: String
    }
  }

  static get observers () {
    return [
      '_routePageChanged(routeData.page)',
      '_subRoutePageChanged(routeData.page, subRouteData.page)',
      'handleLoad(hash)'
    ]
  }

  constructor () {
    super()

    this.notify = window.notify
    window.addEventListener('notify', (e) => {
      this.notify = e.detail
    })
  }

  ready () {
    super.ready()

    this.addEventListener('error', this.handleError)
  }

  _routePageChanged (page) {
    this.page = page || 'index'
  }

  _subRoutePageChanged (category, page) {
    this.subPage = page
    if (category === 'admin' && page && page.length > 0) {
      this._pageChanged(page)
    }
  }

  _pageChanged (page) {
    if (page === 'admin') {
      return
    }

    this.loading = true
    window.scrollTo(0, 0)

    const el = this.elementForPage(page)
    const pageURL = 'components/' + el + '/' + el + '.html'
    Polymer.importHref(
      pageURL,
      this.handleLoad.bind(this),
      this.handle404.bind(this),
      true
    )
  }

  handleLoad () {
    this.loading = false
    // Using setTimeout so the page will load before attempting to navigate to
    // anchor.
    setTimeout(() => {
      this.updateTitle()
      this.navigateAnchor()
    }, 1)
  }

  searchElems () {
    const elems = Array.from(this.$.pages.children).filter((a) => a.tagName !== 'DOM-IF')
    elems.push(this)
    return elems.filter((a) => a.$)
  }

  navigateAnchor () {
    const target = window.location.hash.slice(1)
    if (!target) {
      return
    }

    for (const elem of this.searchElems()) {
      const matching = elem.$[target]
      if (!matching) {
        continue
      }
      matching.scrollIntoView(true)
      return true
    }
    return false
  }

  updateTitle () {
    const title = 'nwHacks 2018'
    const elems = this.searchElems()
    for (const elem of elems) {
      const matching = elem.root.querySelector('h1[title]')
      if (!matching) {
        continue
      }
      document.title = matching.innerText + ' - ' + title
      return
    }

    document.title = title
  }

  adminPage (page) {
    return page === 'admin'
  }

  handleError (e) {
    this.error = e.detail
    console.error(e.detail)
  }

  handle404 () {
    console.log('404!', this.page, this.route)
    this.page = 'notfound'
  }

  elementForPage (page) {
    return {
      mentorexpo: 'mentorexpo-form',
      volunteer: 'volunteer-form',
      register: 'register-form',
      sponsors: 'sponsor-page',
      hiring: 'hiring-page',
      hiring_form: 'hiring-form',
      sponsorship_role: 'sponsorship-role',
      marketing_director_role: 'marketing-director-role',
      logistics_role: 'logistics-role',
      dev_role: 'dev-role',
      writer_role: 'writer-role',
      designer_role: 'designer-role',
      lead_designer_role: 'lead-designer-role',
      evangelist_role: 'evangelist-role',
      select: 'select-hackers',
      settings: 'admin-settings',
      blacklist: 'admin-blacklist-page',
      events: 'admin-events-page',
      hiring_review: 'admin-hiring-page',
      shorturls: 'admin-shorturls-page'
    }[page] || page + '-page'
  }

  logout () {
    this.$.auth.logout()
  }

  notifyButton () {
    this.notify.buttonTapHandler()
  }
}

customElements.define(MainApp.is, MainApp)
