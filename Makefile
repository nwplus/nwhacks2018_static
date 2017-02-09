HTML := $(shell find bower_components components -name \*.html -print)
JS := $(shell find bower_components components -name \*.js -print)
SCSS := $(shell find css -name \*.scss -print)

build: docs/index.html docs/favicon.png

build/: bower_components components index.html css/main.css $(JS) $(HTML) polymer.json
	rm -r build; polymer build

docs/index.html: build/
	rm -r docs; cp -R build/bundled/ docs
	svgo -f docs/svg/logos/

docs/favicon.png: favicon.png
	cp favicon.png docs/

css/main.css: $(SCSS)
	sass css/main.scss:css/main.css

deps:
	bower install
	gem install sass
	sudo npm install -g polymer-cli svgo

watch:
	while true; do \
		make build; \
		inotifywait -qre close_write .; \
	done

clean:
	rm -r build/ docs/

.PHONY: build deps watch clean
