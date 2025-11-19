{/* CHATBOT SECTION */}
<Card className="shadow-sm bg-card border-border">
  <CardHeader>
    <CardTitle className="text-xl font-semibold">
      Assistant virtuel
    </CardTitle>
    <CardDescription>
      Discutez avec l’IA PIMPAY. Posez vos questions en temps réel.
    </CardDescription>
  </CardHeader>

  <CardContent className="p-6">
    {/* Messages container */}
    <div className="border rounded-lg p-4 h-[340px] overflow-y-auto bg-muted/20">
      {messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground mt-10">
          Aucun message pour le moment. Commencez la conversation 👇
        </p>
      ) : (
        messages.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-4 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 text-sm rounded-xl ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))
      )}
    </div>
  </CardContent>

  <CardFooter>
    {/* Chat Input */}
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 w-full"
    >
      <Input
        placeholder="Écrire un message…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-1"
      />

      <Button type="submit" disabled={!input.trim()}>
        Envoyer
      </Button>
    </form>
  </CardFooter>
</Card>
