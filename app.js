// Initialize Firebase
const config = {
  apiKey: "AIzaSyD1cyxQfGrlakzTB9EQ8RY9UBj6RryPn-U",
  authDomain: "rps-m-cb810.firebaseapp.com",
  databaseURL: "https://rps-m-cb810.firebaseio.com",
  projectId: "rps-m-cb810",
  storageBucket: "",
  messagingSenderId: "959550115070"
};
firebase.initializeApp(config);

//refs
const database = firebase.database();
const playersRef = database.ref('/players/');
const playerOneRef = database.ref('/players/one');
const playerTwoRef = database.ref('/players/two');
const playerOneChoiceRef = database.ref('/players/one/choice');
const playerTwoChoiceRef = database.ref('/players/two/choice');
const playerOneWinseRef = database.ref('/players/one/wins');
const playerOneLossesRef = database.ref('/players/one/losses');
const playerTwoWinseRef = database.ref('/players/two/wins');
const playerTwoLossesRef = database.ref('/players/two/losses');
const messagesRef = database.ref('/messages');

const turnRef = database.ref('/turn')
turnRef.onDisconnect().remove();

//game wins/losses
let playerOneWins = 0;
let playerOneLosses = 0;
let playerTwoWins = 0;
let playerTwoLosses = 0;

//player login
$('#add-player').on('click', function(e) {
  e.preventDefault();
  let userId = $('#name').val().trim();
  $('#add-player').prop('disabled', true);
  playersRef.transaction(function(players) {
    if(!players) {
      players = { one: {name: userId,
                        wins: 0,
                        losses: 0},
                 }
      //set disconnect listener
      playerOneRef.onDisconnect().remove();

      $('#user').html(`<h3>Welcome ${userId}. You are Player 1.</h3>`).data({name: userId, player: 1});
      $('#player .form-group').empty();
    } else if (players.hasOwnProperty('one') && players.hasOwnProperty('two')) {
      $('#user').text('Sorry game is full...try again later.')
      return players
    } else if (players.hasOwnProperty('one')) {
      players = { ...players, 
                two: {name: userId,
                  wins: 0,
                  losses: 0}
                }
      database.ref().update({turn: 1})
      $('#user').html(`<h3>Welcome ${userId}. You are Player 2.<h3>`).data({name: userId, player: 2})
        .append(`<h4>Waiting for ${players.one.name} to choose...</h4>`);
      $('#player .form-group').empty();
      //set disconnect listener
      playerTwoRef.onDisconnect().remove();  
    } else if(players.hasOwnProperty('two')) {
      players = { one: {name: userId,
                        wins: 0,
                        losses: 0},
                 ...players }

      $('#user').html(`<h3>Welcome ${userId}. You are Player 1.</h3>`).data({name: userId, player: 1});
      //set disconnect listener
      playerOneRef.onDisconnect().remove();

      setTimeout(function() {
        database.ref().update({turn: 1})
      }, 2000);
      $('#player .form-group').empty(); 
    }                        
    return players;
  });
});

//handle player states
playersRef.on('value', function(snapshot) {
  if(!snapshot.val()) {
    $('.player-name').text('Waiting for Player');
    messagesRef.remove();
    return false;
  } else {
    const players = snapshot.val();
    //display wins
    if(players.one) {
      $('#player-one .wins').text("Wins: " + players.one.wins);
      $('#player-one .losses').text("Losses: " + players.one.losses);
    }
    if(players.two) {
      $('#player-two .wins').text("Wins: " + players.two.wins);
      $('#player-two .losses').text("Losses: " + players.two.losses);
    }
    players.one && !players.two ? playerDisconnect() : false;
    players.two && !players.one ? playerDisconnect() : false; 
    players.one ? $('#player-one .player-name').text(players.one.name) : $('#player-one .player-name').text('Waiting for Player');
    players.two ? $('#player-two .player-name').text(players.two.name) : $('#player-two .player-name').text('Waiting for Player');
    players.one && players.two ? $('#chat-btn').prop('disabled', false) : false;
  }
});

//run game function once second player has chosen
playerTwoChoiceRef.on('value', function(snapshot) {
  if(!snapshot.val()) {
    return false;
  } else {
    const playerTwoChoice = snapshot.val();
    playerOneChoiceRef.once('value', function(snapshot) {
      if(!snapshot.val()) {
        return false;
      } else {
        chooseRPS(snapshot.val(), playerTwoChoice);
      }
    });
  }
});

//turn logic
turnRef.on('value', function(snapshot) {
  if(!snapshot.val()) {
    return false 
  } else {
    if(snapshot.val() === 1) {
      $('#player-two').removeClass('is-turn');
      $('#user h4').empty();
      
      $('#user').data('player') === 1 ? $('#user').append(`<h4>It's your turn.</h4>`) : $('#user').append(`<h4>Waiting for ${$('#player-one .player-name').text()} to choose...</h4>`);
      console.log($('#user').data('name'));
      $('#player-one').addClass('is-turn');
      
      if($('#user').data('player') === 1) {
        const selections = $('<div>');
        $('#player-one .body').append(selections);
        addRpsIcons(selections);
      }                           
    } else if ((snapshot.val() === 2)) {
      $('#player-one').removeClass('is-turn');
      $('#user h4').empty();
      console.log($('#user').data('name'));
      $('#user').data('player') === 2 ? $('#user').append(`<h4>It's your turn.</h4>`) : $('#user').append(`<h4>Waiting for ${$('#player-two .player-name').text()} to choose...</h4>`);
      
      $('#player-two').addClass('is-turn')
      
      if($('#user').data('player') === 2) {
        const selections = $('<div>');
        $('#player-two .body').append(selections);
        addRpsIcons(selections);
      }
    }
  }                    
});


$(document).on('click', '#player-one .hand', function() {
  playerOneChoice = $(this).attr('data-name');
  $('#player-one .body').html(`<h2>${playerOneChoice}</h2>`).hide().fadeIn();
  playerOneRef.update({choice: playerOneChoice});
  database.ref().update({turn: 2})
});

$(document).on('click', '#player-two .hand', function() {
  playerTwoChoice = $(this).attr('data-name');
  $('#player-two .body').html(`<h2>${playerTwoChoice}</h2>`).hide().fadeIn();
  playerTwoRef.update({choice: playerTwoChoice})
});

//game functions
function addRpsIcons(node) {
  node.addClass('selections').html(`
  <i data-name="rock" class="fas fa-hand-rock fa-3x hand"></i>
  <i data-name="paper" class="fas fa-hand-paper fa-3x hand"></i>
  <i data-name="scissors" class="fas fa-hand-scissors fa-3x hand"></i>
  `);
};

function chooseRPS(playerOneChoice, playerTwoChoice) {
  if(playerOneChoice === playerTwoChoice) {
    const h1 = $('<h1>')
    $('#outcome').addClass('yellow').append(h1);
    h1.text(`Tie!`).hide().fadeIn();
    displayChoice();
    resetGame();
  } else if ((playerOneChoice === 'rock' && playerTwoChoice === 'scissors') || +
            (playerOneChoice === 'paper' && playerTwoChoice === 'rock') || +
            (playerOneChoice === 'scissors' && playerTwoChoice === 'paper')) {
    const h1 = $('<h1>')
    $('#outcome').addClass('yellow').append(h1);
    h1.text(`Player 1 Wins`).hide().fadeIn();
    playerOneWins++
    playerTwoLosses++
    playerOneRef.update({wins: playerOneWins});
    playerTwoRef.update({losses: playerTwoLosses});
    displayChoice();
    resetGame();
  } else {
    const h1 = $('<h1>')
    $('#outcome').addClass('yellow').append(h1);
    h1.text(`Player 2 Wins`).hide().fadeIn();
    playerTwoWins++
    playerOneLosses++
    playerOneRef.update({losses: playerOneLosses});
    playerTwoRef.update({wins: playerTwoWins});
    displayChoice();
    resetGame();
  }
};

function displayChoice() {
  playersRef.on('value', function(snapshot) {
    if(!snapshot.val()) {
      return false;
    } else if(snapshot.val().one.choice && snapshot.val().two.choice) {
      const playerOneChoice = snapshot.val().one.choice;
      const playerTwoChoice = snapshot.val().two.choice;
      console.log(playerOneChoice, playerTwoChoice);
      $('#player-one .body').html(`<h2>${playerOneChoice}</h2>`).hide().fadeIn();
      $('#player-two .body').html(`<h2>${playerTwoChoice}</h2>`).hide().fadeIn();
    }
  });
};

function resetGame() {
  setTimeout(function() {
    playerOneChoiceRef.remove();
    playerTwoChoiceRef.remove();
    $('#outcome').removeClass('yellow').empty();
    $('.body h2').empty();
    database.ref().update({turn: 1});
  }, 5000);  
};

function playerDisconnect() {
  database.ref().update({turn: null});
  $('#player-one').removeClass('is-turn');
  $('#player-two').removeClass('is-turn');
  $('#user h4').empty();
  $('.body').empty();
};

// chat functionality
$('#chat-btn').on('click', addMsg)

messagesRef.on('child_added', function(snapshot) {
  const p = $('<p>');
  $('#chat .chat-body').append(p);
  p.text(snapshot.val().name + ': ' + snapshot.val().msg)
});

messagesRef.on('value', function(snapshot) {
  if(typeof snapshot.val() !== 'object')  {
    const p = $('<p>');
    $('#chat .chat-body').append(p);
    p.text(snapshot.val());
  }
});

function addMsg(e) {
  e.preventDefault();
  const msg = $('#chat-input').val().trim();
  const name = $('#user').data('name');
  if($('#user').data('player') === 1) {
    messagesRef.push({name, msg})
    messagesRef.onDisconnect().set(name + ' has disconnected.'); 
  } else if($('#user').data('player') === 2) {
    messagesRef.push({name, msg});
    messagesRef.onDisconnect().set(name + ' has disconnected.');
  }
}; 