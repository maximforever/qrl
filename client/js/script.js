$(document).ready(main);


function main(){
    console.log("Front end JS is up");
   


    $("body").click(function(){  
        $("#error, #message").text("");
    });

/*
    if($("#error").length > 0 || $("#message").length > 0){
        setTimeout(function(){
            $("#error, #message").text("");
        }, 2000)
    }*/



}

