//  $('article img').slice(1).each(function(){
 // var $this = $(this); 
 // $this.attr('data-src',$this.attr('data-src') + "&w=260");
// })

 $('.game-media img').each(function() {
      var img_link =  $(this).attr('data-src').split('&h')[0];
      $(this).wrap('<a href='+ img_link +' data-fancybox="gallery"></a>')
    })
