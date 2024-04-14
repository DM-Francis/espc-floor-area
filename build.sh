#!/bin/bash

build_extension () {
    local browser=$1
    
    rm -rf build/$browser
    mkdir -p build/$browser

    cp src/*.js build/$browser/
    cp src/*.css build/$browser/
    cp src/manifest-$browser.json build/$browser/manifest.json
    cp icons/* build/$browser/

    web-ext build --source-dir build/$browser --artifacts-dir build/$browser/artifacts --overwrite-dest
}

build_extension "firefox"
build_extension "chrome"
