---
title: "Everyday tools, rebuilt in JSX"
date: 2026-10-14T23:51:00+08:00
lastmod: 2026-10-15T22:23:40+08:00
params:
  ai_label: generated
  comments: false
---
Three small tools from Calf’s old articles, rebuilt as React components in this
ordinary Markdown page. No jQuery, inline HTML scripts, remote runtime or old page
styles. Sidera supplies the controls, field groups, help text, validation messages
and result panels. The local stylesheet only adds deliberate presentation choices:
the paper calendar layout, password typography, and larger Chinese reading output.

## Weekday calendar

This is a **paper calculating aid brought online**, not a replacement date-picker.
Its spatial arrangement is the mechanism: the year-ending block sits above the
letter grid; centuries enter from the left and months from the right; the weekday
grid continues the same columns below, alongside the day numbers. The blank areas
are retained so the sheet still reads as one object.

Click cells to pin a selection; hover or keyboard-focus another cell to preview
its path. **Clear highlights** lets you work through the four selections yourself.
**Fit sheet** keeps the whole layout visible; **Actual size** makes the cells easier
to read and lets you pan horizontally on a small screen. The upper-right area is
intentionally blank: the instructions belong here in the article, not in the widget.

{{< jsx src="Calendar.jsx" css="tools.css" caption="The paper lookup layout, with connected interactive paths." fallback="On the paper table, century 20 and year ending 11 intersect at F. Find F in August’s row, then follow its column to day 10: Wednesday." />}}

### Follow the lines: 10 August 2011

1. Find **20** on the left and **11** above. Follow 20’s row right and 11’s
   column down: they intersect at **F**.
2. Find month **8** on the right and follow its row left to **F**.
3. From this second F, follow the column down. Follow day **10** left: the
   crossing says **Wednesday**.

The small controls merely load the example or today’s date into this same sheet.
The two century columns show **15–22**, covering years **1500–2299**. The generic
**4n + x** column is omitted to keep the sheet compact.

**1′ and 2′** are January and February in a leap year. A Gregorian leap year is
divisible by 4, except a century must also be divisible by 400. Manual selections
are never silently corrected: choosing the wrong month variant or an impossible
day keeps the paper path visible and shows a warning. The weekday arithmetic uses
the proleptic Gregorian calendar, not regional historical Julian calendars.

The only numerical correction to the original sheet is the alignment of year
endings **96–99**; the layout and its connected lookup path are retained.

## Kindle 4 recovery password

An offline version of the helper from the 2013 recovery article. It preserves the
original calculation: uppercase the serial, remove whitespace, append a newline,
calculate MD5, and prepend `fiona` to hex characters **8–11**.

This is a **legacy Kindle 4 recovery formula**, not a password generator for current
Kindle models. Use it only for devices you own or are authorized to maintain.
The sample serial is fictional. This demo does not connect to a Kindle or perform
any recovery operation. MD5 is used only for historical compatibility, not as a
recommendation for modern password security.

{{< jsx src="KindlePassword.jsx" css="tools.css" title="Recovery password" caption="Legacy Kindle 4 formula; calculated only in your browser." fallback="JavaScript is required to calculate the legacy password. No device connection is made." />}}

## Integer to Chinese

Enter an integer to see its Chinese reading. Negative values and leading zeroes
are supported, and the input stays a string all the way through—**52 digits without
floating-point rounding**. Empty input clears the result; decimals and exponent
notation are not integers for this tool.

{{< jsx src="NumberChinese.jsx" css="tools.css" caption="String-based conversion preserves integers up to 52 digits." fallback="123456789 reads 一亿二千三百四十五万六千七百八十九." />}}

This preserves the original converter’s reading conventions and large-unit
spellings: 万、亿、兆、京、垓、杼、穰、溝、澗、正、載、極. It is ordinary
number reading, not financial uppercase notation or a currency formatter.

## About these examples

The calendar and number-conversion logic are adapted from Calf’s supplied 2011 and
2014 tools; the Kindle formula is from the supplied 2013 helper. Their GoCalf source
files and site have not been changed. The optional 2011 Google Calder doodle is not
included: its animation engine and attributed artwork are a separate project, not
a necessary dependency of these tools.

The showcase bundles [blueimp-md5 2.19.0](https://github.com/blueimp/JavaScript-MD5)
for the legacy hash, with its [MIT license](vendor/md5-LICENSE.txt) and retained
Paul Johnston/contributor attribution. No additional package installation is needed
to build or use these examples.

For smaller authoring examples, return to the [JSX playground](../jsx/index.md).
