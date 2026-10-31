// abhi.js
document.addEventListener("DOMContentLoaded", function() {
    // Include jQuery DataTables and its extensions
    const scripts = [
        "https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js",
        "https://cdn.datatables.net/buttons/2.4.1/js/dataTables.buttons.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js",
        "https://cdn.datatables.net/buttons/2.4.1/js/buttons.html5.min.js",
        "https://cdn.datatables.net/buttons/2.4.1/js/buttons.print.min.js",
        "https://cdn.datatables.net/buttons/2.4.1/js/buttons.colVis.min.js",
        "https://cdn.datatables.net/buttons/2.4.1/js/buttons.bootstrap5.min.js",
        "https://cdn.datatables.net/select/1.7.0/js/dataTables.select.min.js"
    ];

    scripts.forEach(src => {
        const script = document.createElement("script");
        script.src = src;
        document.head.appendChild(script);
    });
});



