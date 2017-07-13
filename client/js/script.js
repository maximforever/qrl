$(document).ready(main);


function main(){
    console.log("Front end JS is up");
   
/*
    if($("#error").length > 0 || $("#message").length > 0){
        setTimeout(function(){
            $("#error, #message").text("");
        }, 2000)
    }*/


    $("#async").on("click", function(){
        console.log("Async!");
        $(this).html("Sending request...");

        $.ajax({
            type: "post",
            url: "/async",
            success: function(result){
                $("#async").html("got a response!");
                console.log("got a response!");
                $.ajax({
                    type: "post",
                    url: "/false",
                    success: function(result){
                        console.log("got false");
                        
                    }
                })
            }   
        })


    });

    $("#trigger").on("click", function(){

        $.ajax({
            type: "post",
            url: "/trigger",
            success: function(result){
                console.log("triggered false");

            }
        })
    });

    $("#false").on("click", function(){
        $("#async").html("Send request");
        $.ajax({
            type: "post",
            url: "/false",
            success: function(result){
                $("#async").html("Send request");
            }
        })
    });


}

