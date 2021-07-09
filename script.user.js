// ==UserScript==
// @name         Facebook Marketplace Helper
// @namespace    https://github.com/featherbear/facebook-marketplace-helper/
// @version      0.1
// @description  Hide sponsored ads, mark viewed items
// @author       You
// @match        https://www.facebook.com/marketplace/*/search/?query=*
// @match        https://www.facebook.com/marketplace/item/*
// @icon         https://www.google.com/s2/favicons?domain=facebook.com
// @grant   GM_getValue
// @grant   GM_setValue
// ==/UserScript==

;(function () {
  'use strict'
  const pollTimeMS = 2000
  const seenArrayKey = 'fbmh-seen'
  const seenAttributeKey = 'fbmh-seen'

  function recurseParent (obj, n) {
    for (let i = 0; i < n; i++) obj = obj?.parentNode
    return obj
  }

  function setSeen (value) {
    // mark `value` as seen
    GM_setValue(
      seenArrayKey,
      Array.from(new Set([...GM_getValue(seenArrayKey), value]))
    )
  }

  function parseID (url) {
    try {
      return Number(/\/item\/(\d+?)\//.exec(url)[1])
    } catch {
      console.warn('Could not parse ID from', url)
      return null
    }
  }

  function doSponsorYeet () {
    let XPaths = document.evaluate(
      '//span[text()="Sponsored"]',
      document.documentElement,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    )
    let textElem
    for (let i = 0; ; i++) {
      if (!(textElem = XPaths.snapshotItem(i))) break
      let elem = recurseParent(textElem, 11)
      elem.style.display = 'none'

      // it just gets replaced by a different ad ....
      //   elem.parentNode.removeChild(elem)
    }
  }

  function doMark () {
    let seenItems = GM_getValue(seenArrayKey)
    for (let textElem of document.querySelectorAll(
      `a[href^="/marketplace/item/"]:not([${seenAttributeKey}])`
    )) {
      let [price, name, location] = textElem.innerText.split('\n')
      let id = parseID(textElem.href)
      if (!id) continue

      if (seenItems?.includes(id)) {
        let elem = recurseParent(textElem, 5)
        elem.setAttribute(seenAttributeKey, '')
      }
    }
  }

  let lastURL = null

  setInterval(function () {
    let hasURLchanged = window.location.href != lastURL
    lastURL = window.location.href

    let itemID
    if (hasURLchanged) {
      if ((itemID = parseID(lastURL))) {
        // Log a new view
        // console.debug('Classified:', itemID)
        setSeen(itemID)
      } else {
        // console.debug('Listing page')
      }
    } else if (!/\/marketplace\/item\//.test(lastURL)) {
      doSponsorYeet()
      doMark()
    }
  }, pollTimeMS)

  {
    let sheet = window.document.styleSheets[0]
    sheet.insertRule(
      `
[${seenAttributeKey}] {
    opacity: 0.4;
    filter: saturate(0.1);}
`,
      sheet.cssRules.length
    )

    sheet.insertRule(
      `
[${seenAttributeKey}]:hover {
    opacity: 1;
    filter: saturate(1);
}
`,
      sheet.cssRules.length
    )
  }

  if (!Array.isArray(GM_getValue(seenArrayKey))) GM_setValue(seenArrayKey, [])
  console.info('Facebook Marketplace Helper loaded!')
})()
