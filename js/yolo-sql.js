;(function (yolo_sql, $, undefined) {
    // Private variables
    var site_url = '',
        editor = CodeMirror.fromTextArea(document.getElementById('code'), {
                mode: 'text/x-mysql',
                indentWithTabs: true,
                smartIndent: true,
                lineNumbers: true,
                matchBrackets : true,
                autofocus: true,
                extraKeys: {"Ctrl-Space": "autocomplete"},
        }),
        table_html = '<table id="output-table" class="table table-condensed table-bordered table-hover"></table>';
        
    // Public variables
    yolo_sql.VERSION = '';
    yolo_sql.AUTHORS = ['Ossama Edbali'];
    
    // Bind events
    $('#select-statement').click(function() {
        editor.setValue("SELECT * FROM tbl_name;");
    });
    
    $('#insert-statement').click(function() {
        editor.setValue("INSERT INTO tbl_name (some_column) VALUES (some_value);");
    });
    
    $('#update-statement').click(function() {
        editor.setValue("UPDATE tbl_name SET column1=value1 WHERE some_column=some_value;");
    });
    
    $('#delete-statement').click(function() {
        editor.setValue("DELETE FROM tbl_name WHERE some_column=some_value;");
    });
    
    // Private functions
    var
    process_data = function(data) {
        console.log(data);
        
        var status = data.status,
            type = data.type,
            content = data.content;
        
        // Remove previous content
        $('#output-section').html();
        
        if (!status) {
            $('#output-section').html('<p>' + content + '</p>');
        } else {
            if (type === 'r') {
                if (content.length > 0) {
                    var pivot = content[0],
                        columns = [];
                    
                    // Store column names
                    for (column in pivot) {
                        columns.push(column);
                    }
                    
                    // Build HTML for table
                    $('#output-section').append(table_html);
                    $('#output-table').html(get_columns_html(columns) + get_rows_html(content));
                } else {
                    // Empty set
                }
            } else if (type === 'w') {
                $('#output-section').html('<p>Affected rows: ' + content + '</p>');
            }
        }
    },
    
    get_columns_html = function(columns) {
        var html = '<thead>',
            clen = columns.length,
            i = 0;
        
        for (i = 0; i < clen; i++) {
            html += '<td>'  + columns[i] + '</td>';
        }
        html += '</thead>';
        
        return html;
    },
    
    get_rows_html = function(content) {
        var html = '<tbody>',
            clen = content.length,
            i;
    
        for (i = 0; i < clen; i++) {
            html += '<tr>';
            for (column in content[i]) {
                html += '<td>' + content[i][column] + '</td>';
            }
            html += '</tr>';
        }
        
        return html;
    };
    
    // Public API
    yolo_sql.set_site_url = function(surl) {
        site_url = surl;
    };
    
    yolo_sql.use_schema = function() {
        $('a.database').removeClass('active');
                
        var db_name = $(this).data('schema'); // Check

        $.post(site_url + 'index.php/home/use_database', {'db_name' : db_name}, function(data) {
            $('#' + data).addClass('active');
        });
    };
    
    yolo_sql.execute_on_cursor = function() {
        var cursor = editor.getCursor(),
                    content = editor.getLine(cursor.line);
                    
        $.post(site_url + 'index.php/home/execute_statements', {'content': content}, process_data);
    };
    
    yolo_sql.execute_selected = function() {
        var content = editor.getSelection();
                
        $.post(site_url + 'index.php/home/execute_statements', {'content': content}, process_data);
    };
    
    yolo_sql.create_schema = function(e) {
        e.preventDefault();
        
        var $el = $(this);
        $.post($el.attr('action'), $el.serialize(), function(data) {
            var status = data.status,
                content = data.content;
            
            if (status) {
                location = site_url + 'index.php/home';
            } else {
                $('#output-section').html('<p>' + content + '</p>');
                console.log(data);
            }
            
            // Dismiss modal
            $('#createSchemaModal').modal('hide');
        });
    };
    
    yolo_sql.drop_schema = function(schema) {
        $.post(site_url + 'index.php/home/drop_schema', {'schema': schema}, function(data) {
            var status = data.status,
                content = data.content;
            
            if (status) {
                location = site_url + 'index.php/home';
            } else {
                $('#output-section').html('<p>' + content + '</p>');
                console.log(data);
            }
        });
    };
    
    yolo_sql.add_field = function() {
        var str = 
                '<tr>' +
                    '<td><input data-field="name" type="text" class="form-control"></td>' +
                    '<td><input data-field="type" type="text" class="form-control"></td>' +
                    '<td><input data-field="pk" type="checkbox"></td>' +
                    '<td><input data-field="nn" type="checkbox"></td>' +
                    '<td><input data-field="ai" type="checkbox"></td>' +
                    '<td><input data-field="default" type="text" class="form-control"></td>' +
                    '<td><button class="create-table-delete-field" class="btn btn-xs btn-danger">D</button></td>' +
                '</tr>';
        
        $('#create-table-cols').append(str);
    };
    
    yolo_sql.create_table = function() {
        var db_name = $('#create-table-schema-name').val(),
            table_name = $('#create-table-table-name').val(),
            engine = $('#create-table-engine').val(),
            $rows = $('#create-table-cols').children(),
            sql = 'CREATE TABLE ' + db_name + '.' + table_name + ' (';
    
        $rows.each(function() {
            var def = $(this).find('[data-field="default"]').val(),
                pk = $(this).find('[data-field="pk"]').is(':checked'),
                nn = $(this).find('[data-field="nn"]').is(':checked'),
                ai = $(this).find('[data-field="ai"]').is(':checked');
                
            // Insert fields
            sql += $(this).find('[data-field="name"]').val() + ' ';
            sql += $(this).find('[data-field="type"]').val() + ' ';
            
            if (pk) {
                sql += 'PRIMARY KEY ';
            }
            
            if (pk && ai) {
                sql += 'AUTO_INCREMENT ';
            }
            
            sql += (!pk && !ai && !nn) ? 'NULL ' : 'NOT NULL ';
            sql += (def !== '' ? 'DEFAULT ' + "'" + def + "'" : '') + ' ';
            
            sql.trim();
            sql += ',';
        });
        
        // Remove trailing comma
        sql = sql.slice(0, -1);
        
        sql += ') ENGINE = ' + engine;
        $.post(site_url + 'index.php/home/create_table', {'sql': sql}, function(data) {
            var status = data.status,
                content = data.content;
            
            if (status) {
                //location = site_url + 'index.php/home';
                $('#create-table-success-alert').removeAttr('hidden');
            } else {
                $('#create-table-error-alert')
                        .append('<p><strong>Error!</strong> ' + content + '</p>')
                        .removeAttr('hidden');
            }
        });
        
        console.log(sql);
    };
    
    yolo_sql.drop_table = function(table) {
        $.post(site_url + 'index.php/home/drop_table', {'table': table}, function(data) {
            var status = data.status,
                content = data.content;
            
            if (status) {
                location = site_url + 'index.php/home';
            } else {
                $('#output-section').html('<p>' + content + '</p>');
            }
        });
    };
})(window.yolo_sql = window.yolo_sql || {}, jQuery);