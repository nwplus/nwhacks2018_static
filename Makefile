HTML := $(shell find bower_components components -name \*.html -print)
JS := $(shell find bower_components components -name \*.js -print)
SCSS := $(shell find css -name \*.scss -print)

build: docs/index.html

build/: bower_components components index.html css/main.css $(JS) $(HTML) polymer.json
	rm -r build; polymer build

docs/index.html: build/
	rm -r docs; cp -R build/bundled/ docs

css/main.css: $(SCSS)
	sass css/main.scss:css/main.css

deps:
	bower install
	gem install sass
	sudo npm install -g polymer-cli

watch:
	while true; do \
		make build; \
		inotifywait -qre close_write .; \
	done

clean:
	rm -f index.html index.js

.PHONY: build deps watch clean
