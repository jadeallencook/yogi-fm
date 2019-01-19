<?php
    // perameters
    $name = $argv[1];

    // component
    $component = fopen("src/components/$name.js", 'w') or die('Unable to open file!');
    $js = "
    import React, { Component } from 'react';
    import './$name.scss';

    class $name extends Component {
        render() {
            return (
                <div className=\"$name\">$name component works!</div>
            )
        }
    }

    export default $name;
    ";
    fwrite($component, $js);
    fclose($component);
    
    // style
    $style = fopen("src/components/$name.scss", 'w') or die('Unable to open file!');
    $scss = "
    @import '../global.style.scss';
    
    div.$name {}
    ";
    fwrite($style, $scss);
    fclose($style);
?>