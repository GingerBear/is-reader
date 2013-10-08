// ISReader PDF Reader, Based on pdf.js
// 
// render a page of a pdf file, append hightlights and notes,
// send new highlights and notes to server, track reading 
// progress.
// 
// Input: page, highlights objects, notes objects
// Author: Neil Ding

var loadPage = (function () {

    var pdfData = 'data/pdf/dba.pdf'; // should read from URL or DOM

    var scale = 2; // Set this to whatever you want. This is basically the "zoom" factor for the PDF.

    var page = 44; // fill current page by server

    var highlights = []; // fill hights of current page by server

    var pdf; // store pdf file into a local variable 


    // RENDER 


    // load the pdf file the first time loaded.
    function loadPdf(pdfData) {
        PDFJS.disableWorker = true; //Not using web workers. Not disabling results in an error. This line is
        //missing in the example code for rendering a pdf.
        pdf = PDFJS.getDocument(pdfData);
        pdf.then(renderPdf);
    }

    // render a page of pdf file, can only used by then(). will be called when goes to a new page
    function renderPdf(pdf) {
        pdf.getPage(page).then(renderPage);
    }

    // render each page
    function renderPage(page) {
        var viewport = page.getViewport(scale);
        var $canvas = jQuery("<canvas></canvas>");

        //Set the canvas height and width to the height and width of the viewport
        var canvas = $canvas.get(0);
        var context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        //Append the canvas to the pdf container div
        var $pdfContainer = jQuery("#pdfContainer");
        $pdfContainer.css("height", canvas.height + "px").css("width", canvas.width + "px");
        $pdfContainer.append($canvas);

        //The following few lines of code set up scaling on the context if we are on a HiDPI display
        var outputScale = getOutputScale();
        if (outputScale.scaled) {
            var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' +
                (1 / outputScale.sy) + ')';
            CustomStyle.setProp('transform', canvas, cssScale);
            CustomStyle.setProp('transformOrigin', canvas, '0% 0%');

            if ($textLayerDiv.get(0)) {
                CustomStyle.setProp('transform', $textLayerDiv.get(0), cssScale);
                CustomStyle.setProp('transformOrigin', $textLayerDiv.get(0), '0% 0%');
            }
        }

        context._scaleX = outputScale.sx;
        context._scaleY = outputScale.sy;
        if (outputScale.scaled) {
            context.scale(outputScale.sx, outputScale.sy);
        }

        var canvasOffset = $canvas.offset();
        var $textLayerDiv = jQuery("<div />")
            .addClass("textLayer")
            .css("height", viewport.height + "px")
            .css("width", viewport.width + "px")
            .offset({
                top: canvasOffset.top,
                left: canvasOffset.left
            });

        $pdfContainer.append($textLayerDiv);

        page.getTextContent().then(function (textContent) {
            var textLayer = new TextLayerBuilder($textLayerDiv.get(0), 0); //The second zero is an index identifying
            //the page. It is set to page.number - 1.
            textLayer.setTextContent(textContent);

            var renderContext = {
                canvasContext: context,
                viewport: viewport,
                textLayer: textLayer
            };

            page.render(renderContext).then(function(){      

                // after page rendered, fill the highlights and notes. 
                // Currently by a pre loaded global variable.
                // To fix, a ajax function should be called to get the real highlight and notes data from server.

                for (var i = highlights.length - 1; i >= 0; i--) {
                    hlByOffset(highlights[i].startContainer, highlights[i].endContainer, highlights[i].startOffset, highlights[i].endOffest);
                };

            });
        });
    }

    // EVENTS
    
    window.onload = function () {
        loadPdf(pdfData);
    };

    $('.next-page').click(function () {
        highlights = [];
        pageGoto(page+1);

        // code : track progross to server
    });

    $('.pre-page').click(function () {
        highlights = [];
        pageGoto(page-1);

        // code : track progross to server
    });

    function pageGoto(p) {
        page = p;
        jQuery("#pdfContainer").html("");
        $("html, body").animate({ scrollTop: 0 }, 0);
        pdf.then(renderPdf);        
    }

    function hideToolPop() {
        $('.tool-pop').animate({
            top: "-=10",
            opacity: 0
        }, 100, function() {
            $(this).addClass('hidden');
        });
    }

    function showToolPop(x, y) {
        $('.tool-pop').removeClass('hidden').css({
            'top': y + 'px',
            'left': x + 'px',
            opacity: 0
        }).animate({
            top: "+=10",
            opacity: 1
        }, 100);
    }

    function getSelectionObj() {
        if (window.getSelection) {
          selection = window.getSelection();
        } else if (document.selection) {
          selection = document.selection.createRange();
        }
        // console.log(selection.getRangeAt(0));
        // console.log(selection.getRangeAt(0).endContainer.parentElement);
        // console.log($(selection.getRangeAt(0).startContainer.parentElement).index());
        // console.log($(selection.getRangeAt(0).endContainer.parentElement).index());
        // console.log(selection.getRangeAt(0).startOffset);
        // console.log(selection.getRangeAt(0).endOffset);
        return selection;
    }

    var hlByOffset = (function () {
        var commonContainer = ".textLayer";
        var getEleByIndex = function (container) {
            return $(commonContainer + ' div:eq(' + container + ')')
        }
        var wrapByOffset = function ($el, from, to, wrapperTag) {
            var len = $el.html().length;
            from = from || 0;
            to = to || len;
            // console.log(from); 
            // console.log(to); 
            $el.html($el.html().substring(0, from) + "<span class='hl-text'>" + $el.html().substring(from, to) + "</span>" + $el.html().substring(to));
        }
        return function (startContainer, endContainer, startOffset, endOffest) {
            wrapByOffset(getEleByIndex(startContainer), startOffset, undefined);
            wrapByOffset(getEleByIndex(endContainer), undefined, endOffest);
            for (var i = startContainer + 1; i < endContainer; i++) {
                wrapByOffset(getEleByIndex(i), undefined, undefined);
            };
        }
    })();


    $('#pdfContainer').on('mouseup', function(e) {
        var selection = getSelectionObj();
        if (selection != "") {



            // load highlights
            // hlByOffset(9, 18, 14, 22)



            console.log("=========== Text Selection Captured ===========");
            console.log("Page: " + page);
            console.log("Starting div index: " + $(selection.getRangeAt(0).startContainer.parentElement).index());
            console.log("Ending div index: " + $(selection.getRangeAt(0).endContainer.parentElement).index());
            console.log("Starting div cursor index: " + selection.getRangeAt(0).startOffset);
            console.log("Ending div cursor index: " + selection.getRangeAt(0).endOffset);

            // var endEl = $(selection.getRangeAt(0).endContainer.parentElement);

            showToolPop(e.pageX, e.pageY);
        }
    });

    // remove pop-up
    $(document.body).on('mousedown', function() {
        // clear text selection
        if (window.getSelection()) {
            // for non-IE
            window.getSelection().removeAllRanges();
        } else {
            // for IE
            document.selection.empty();
        }
        hideToolPop();
    });

    // prevent remove pop-up when click on pop-up
    $('.tool-pop').on('mousedown click', function(e) {
        e.stopPropagation();    
    });

    $('.tool-pop .hl-btn').click(function() {
        hideToolPop();
    });

    // just for demo

    return function loadPageHL(p, startContainer, endContainer, startOffset, endOffest) {
        highlights[0] = {
            page : page-1, 
            startContainer : startContainer, 
            endContainer : endContainer, 
            startOffset : startOffset, 
            endOffest : endOffest
        };

        pageGoto(p);

    }

})();
