HTML := $(shell find bower_components components -name \*.html -print)
JS := $(shell find bower_components components -name \*.js -print)
SCSS := $(shell find css -name \*.scss -print)
EXTRA_URLS := $(shell sed "s/.*/docs\/&.html/g" < extra-200-urls)

build: docs/index.html docs/favicon.png docs/social.html docs/card-reader.html $(EXTRA_URLS)

build/: bower_components/ components index.html css/main.css $(JS) $(HTML) polymer.json
	polymer build

bower_components/: bower.json
	bower update
	bower prune

docs/index.html: build/
	rm -rf docs; cp -R build/default/ docs
	svgo -f docs/svg/logos/

$(EXTRA_URLS): build/ docs/index.html
	cp docs/index.html $@

docs/favicon.png: favicon.png
	cp favicon.png docs/

docs/social.html: social.html
	cp social.html docs/

docs/card-reader.html: util/card-reader.html
	vulcanize util/card-reader.html > docs/card-reader.html

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
