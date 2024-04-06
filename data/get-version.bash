#!/bin/bash

variant="jawiktionary"
if [[ $(head -1 $variant-latest-md5sums.txt) =~ -([[:digit:]]{8})- ]]; then
    echo "${BASH_REMATCH[1]}"
fi
