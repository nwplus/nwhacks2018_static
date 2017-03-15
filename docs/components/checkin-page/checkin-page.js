Polymer({
  is: 'checkin-page',

  properties: {
    display: {
      value: false,
    },
  },

  observers: [
    'handleRegistrations(registrations)',
    'handleSearch(query, lunr)',
    'updateStatus(display.checked_in)',
  ],

  ready: function() {
    this.$.search.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.code === "ArrowDown") {
        this.autocompleteIndex = Math.min(this.autocompleteIndex+1, this.autocomplete.length-1);
      } else if (e.code === "ArrowUp") {
        this.autocompleteIndex = Math.max(this.autocompleteIndex-1, 0);
      } else if (e.code === "Enter") {
        this.select();
      } else {
        return;
      }
      e.preventDefault();
    });

    this.keyHandler = this.keyHandler.bind(this);
  },

  attached: function() {
    document.addEventListener('keydown', this.keyHandler);
  },

  detached: function() {
    document.removeEventListener('keydown', this.keyHandler);
  },

  keyHandler: function(e) {
    if (e.code === "Slash") {
      this.$.search.inputElement.focus();
    } else if (e.code === "Space" && this.display) {
      this.set('display.checked_in', !this.display.checked_in);
    } else {
      return;
    }
    e.preventDefault();
  },

  handleTap: function(e) {
    this.autocompleteIndex = e.model.index;
    this.select();
  },

  select: function() {
    const id = this.autocomplete[this.autocompleteIndex];
    if (!id) {
      return;
    }
    this.displayID = id;
    const display = this.registrations[id];
    if (display.checked_in === undefined) {
      display.checked_in = false;
    }
    this.query = "";
    this.display = display;
    this.autocomplete = [];
    this.$.search.inputElement.blur();
  },

  heading: function(hacker) {
    return hacker.name + " <"+hacker.email+">";
  },

  eq: function(a, b) {
    return a === b;
  },

  handleRegistrations: function(registrations) {
    this.updateLunrIndex(registrations);
  },

  handleSearch: function(query, lunr) {
    const newAutocomplete = this.lunr.search(query).slice(0,5).map((a) => a.ref);

    if (JSON.stringify(newAutocomplete) !== JSON.stringify(this.autocomplete)) {
      this.autocompleteIndex = 0;
      this.autocomplete = newAutocomplete;
      this.display = false;
    }
  },

  updateLunrIndex: function(registrations) {
    const regCount = Object.keys(registrations).length;
    if (this.lastLunrIndexCount === regCount) {
      return;
    }
    this.lastLunrIndexCount = regCount;

    const search = lunr(function() {
      this.ref('id');
      this.field('email');
      this.field('emailSplit');
      this.field('name');
    });
    for (let id of Object.keys(registrations)) {
      const hacker = registrations[id];
      search.add({
        id: id,
        email: hacker.email,
        emailSplit: hacker.email.replace(/\W+/g, ' '),
        name: hacker.name
      });
    }
    this.lunr = search;
  },

  name: function(registrations, id) {
    return registrations[id].name;
  },

  email: function(registrations, id) {
    return registrations[id].email;
  },

  warnStatus: function(hacker) {
    const status = this.displayStatus(hacker);
    return status === "Accepted, No Response" || status === "waitlisted";
  },

  dangerStatus: function(hacker) {
    const status = this.displayStatus(hacker);
    return status === "rejected";
  },

  displayStatus: function(hacker) {
    if (hacker.status === "accepted") {
      if (hacker.rsvp) {
        return "accepted";
      } else {
        return "Accepted, No Response";
      }
    }

    return hacker.status;
  },

  warnAge: function(age) {
    return age && age.indexOf("under") !== -1;
  },

  updateStatus: function() {
    const firebase = this.querySelector("#regs");
    if (!firebase || !this.displayID || !this.display) {
      return;
    }
    firebase.setStoredValue("/registrations/"+this.displayID+"/checked_in", this.display.checked_in);
  },
});
