import { MatchModel } from "@/types/Match";
import {
  deleteMatchQuery,
  getCantPlayersByScheduleQuery,
  getMatchByCourtQuery,
  getMatchByIdQuery,
  getMatchesQuery,
  getPlayerJoinedByMatchQuery,
  joinMatchQuery,
  quitMatchQuery,
  updatePlayersCountQuery,
} from "@/db/MatchQueries";
import {
  deleteMatch,
  getMatchByCourt,
  getMatches,
  joinMatch,
  leaveMatch,
} from "../Match";
import { CourtModel } from "@/types/Court";
import { getCourtByIdQuery } from "@/db/CourtQueries";
import { getAccountByIdQuery } from "@/db/AccountQueries";
import { AccountModel } from "@/types/Account";
import {
  deleteReservationQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
} from "@/db/ReservationQueries";

jest.mock("@/services/webSocket", () => {
  return {
    __esModule: true,
    emitMessageToMatch: jest.fn(),
  };
});

jest.mock("@/services/DateService", () => {
  return {
    __esModule: true,
    getCurrentTime: jest.fn(),
  };
});

jest.mock("@/db/MatchQueries", () => {
  return {
    __esModule: true,
    getMatchesQuery: jest.fn(),
    getMatchByCourtQuery: jest.fn(),
    deleteMatchQuery: jest.fn(),
    getMatchByIdQuery: jest.fn(),
    getPlayerJoinedByMatchQuery: jest.fn(),
    getCantPlayersByScheduleQuery: jest.fn(),
    updatePlayersCountQuery: jest.fn(),
    joinMatchQuery: jest.fn(),
    quitMatchQuery: jest.fn(),
  };
});

jest.mock("@/db/AccountQueries", () => {
  return {
    __esModule: true,
    getAccountByIdQuery: jest.fn(),
  };
});

jest.mock("@/db/CourtQueries", () => {
  return {
    __esModule: true,
    getCourtByIdQuery: jest.fn(),
  };
});

jest.mock("@/db/ReservationQueries", () => {
  return {
    __esModule: true,
    deleteReservationQuery: jest.fn(),
    updatePreReserveStatusQuery: jest.fn(),
    updateReservationStatusQuery: jest.fn(),
  };
});

describe("Match", () => {
  const mockMatches: MatchModel[] = [
    {
      id: "1",
      creator_id: "1",
      court_id: "1",
      reservation_id: "1",
      current_players: 2,
      total_players: 4,
      price_per_player: 15,
      status: "pending",
    },
  ];

  const mockCourts: CourtModel[] = [
    {
      complex_id: "10",
      sport_id: "100",
      name: "Court A",
      image_url: "http://image.url/courtA.jpg",
    },
  ];

  const mockAccounts: AccountModel[] = [
    {
      id: "1",
      name: "Player One",
      email: "playerone@example.com",
      password: "hashedpassword",
      birthdate: "1995-05-15",
      phone: "1234567890",
      account_type: "user",
    },
    {
      id: "2",
      name: "Admin User",
      email: "adminuser@example.com",
      password: "hashedpassword",
      birthdate: "1990-01-01",
      phone: "0987654321",
      account_type: "admin",
    },
  ];

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Get Matches", () => {
    //Test case: get a list of all matches
    test("Should get all matches successfully", async () => {
      (getMatchesQuery as jest.Mock).mockResolvedValue({
        rows: mockMatches,
      });

      await getMatches({} as any, res as any);

      expect(getMatchesQuery).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Match List",
        data: mockMatches,
      });
    });

    //Test case: error while getting matches
    test("Should handle error when getting matches", async () => {
      (getMatchesQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await getMatches({} as any, res as any);

      expect(getMatchesQuery).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Get Match By Court", () => {
    //Test case: get matches by court ID
    test("Should get matches by court ID successfully", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: mockCourts,
      });

      (getMatchByCourtQuery as jest.Mock).mockResolvedValue({
        rows: mockMatches,
      });

      await getMatchByCourt({ params: { id: "1" } } as any, res as any);

      expect(getCourtByIdQuery).toHaveBeenCalledWith("1");
      expect(getMatchByCourtQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Match List",
        data: mockMatches,
      });
    });

    //Test case: court not found
    test("Should return 404 if court not found", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await getMatchByCourt({ params: { id: "2" } } as any, res as any);

      expect(getCourtByIdQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Court not found",
      });
    });

    //Test case: error while getting matches by court
    test("Should handle error when getting matches by court", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: mockCourts,
      });

      (getMatchByCourtQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await getMatchByCourt({ params: { id: "1" } } as any, res as any);

      expect(getCourtByIdQuery).toHaveBeenCalledWith("1");
      expect(getMatchByCourtQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Delete Match", () => {
    // Test case: delete a match
    test("Should delete a match", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockMatches[0]],
      });

      (deleteMatchQuery as jest.Mock).mockResolvedValue({
        rows: [mockMatches[0]],
      });

      await deleteMatch({ params: { id: "1" } } as any, res as any);

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(deleteMatchQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Match deleted successfully",
        data: mockMatches[0],
      });
    });

    // Test case: match not found
    test("Should return 404 error when match to delete not found", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await deleteMatch({ params: { id: "2" } } as any, res as any);

      expect(getMatchByIdQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match not found",
      });
    });

    // Test case: database query failure
    test("Should return 500 error when deletion fails", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockMatches[0]],
      });

      (deleteMatchQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await deleteMatch({ params: { id: "1" } } as any, res as any);

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(deleteMatchQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Join Match", () => {
    //Test case: join a match
    test("Should join a match successfully", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockMatches[0]],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      (getPlayerJoinedByMatchQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
      });

      (getCantPlayersByScheduleQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [{ max_players: 8 }],
      });

      (updatePlayersCountQuery as jest.Mock).mockResolvedValue({
        rows: [{ current_players: 4 }],
      });

      (joinMatchQuery as jest.Mock).mockResolvedValue({
        rows: [
          {
            match_id: "1",
            player_id: "1",
            joined_at: "2025-01-01 12:00:00",
          },
        ],
      });

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPlayerJoinedByMatchQuery).toHaveBeenCalledWith("1", "1");
      expect(getCantPlayersByScheduleQuery).toHaveBeenCalledWith("1");
      expect(joinMatchQuery).toHaveBeenCalled();
      expect(updatePlayersCountQuery).toHaveBeenCalledWith(
        "1",
        mockMatches[0].id
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Player joined match successfully",
        data: expect.objectContaining({
          match_id: "1",
          player_id: "1",
        }),
      });
    });

    //Test case: player already joined
    test("Should return 400 if player already joined the match", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockMatches[0]],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      (getPlayerJoinedByMatchQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
      });

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPlayerJoinedByMatchQuery).toHaveBeenCalledWith("1", "1");
      expect(joinMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Player already joined this match",
      });
    });

    //Test case: match not found
    test("Should return 404 if match not found", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(joinMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match not found",
      });
    });

    //Test case: player not found
    test("Should return 404 if player not found", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockMatches[0]],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(joinMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Player not found",
      });
    });

    //Test case: admin player trying to join
    test("Should return 400 if admin tries to join a match", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockMatches[0]],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[1]],
      });

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "2",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("2");
      expect(joinMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Admins cannot join matches",
      });
    });

    //Test case: match is already completed
    test("Should return 400 if match is already completed", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowsCount: 1,
        rows: [
          {
            ...[mockMatches[0]],
            status: "completed",
          },
        ],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowsCount: 1,
        rows: [mockAccounts[0]],
      });

      (getPlayerJoinedByMatchQuery as jest.Mock).mockResolvedValue({
        rowsCount: 0,
      });

      (getCantPlayersByScheduleQuery as jest.Mock).mockResolvedValue({
        rowsCount: 1,
        rows: [{ count: mockMatches[0].total_players }],
      });

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPlayerJoinedByMatchQuery).toHaveBeenCalledWith("1", "1");
      expect(getCantPlayersByScheduleQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match is already completed",
      });
    });

    //Test case: database query failure
    test("Should return 500 error when query fails", async () => {
      (getMatchByIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await joinMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).not.toHaveBeenCalled();
      expect(joinMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Leave Match", () => {
    //Test case: leave match success
    test("Should leave a match successfully", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            ...mockMatches[0],
            creator_id: "2",
          },
        ],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      (updatePlayersCountQuery as jest.Mock).mockResolvedValue({
        rows: [{ current_players: 1 }],
      });

      (quitMatchQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            match_id: "1",
            player_id: "1",
          },
        ],
      });

      await leaveMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(updatePlayersCountQuery).toHaveBeenCalledWith("-1", "1");
      expect(quitMatchQuery).toHaveBeenCalledWith("1", "1");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Player left match successfully",
        data: expect.objectContaining({
          match_id: "1",
          player_id: "1",
        }),
      });
    });

    //Test case: match not found
    test("Should return 404 if match not found", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      await leaveMatch(
        {
          body: {
            match_id: "999",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("999");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(quitMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match not found",
      });
    });

    //Test case: player not found
    test("Should return 404 if player not found", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockMatches[0]],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await leaveMatch(
        {
          body: {
            match_id: "1",
            player_id: "999",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("999");
      expect(quitMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found",
      });
    });

    //Test case: creator cannot leave match
    test("Should return 404 if creator tries to leave match", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            ...mockMatches[0],
            creator_id: "1",
          },
        ],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      await leaveMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(quitMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "The Creator Match cannot leave, he must cancel it",
      });
    });

    //Test case: cannot leave completed match
    test("Should return 400 if match is already completed", async () => {
      (getMatchByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            ...mockMatches[0],
            creator_id: "2",
            status: "completed",
          },
        ],
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      await leaveMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(quitMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Cannot leave match, it is already completed",
      });
    });

    //Test case: database query failure
    test("Should return 500 error when query fails", async () => {
      (getMatchByIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await leaveMatch(
        {
          body: {
            match_id: "1",
            player_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).not.toHaveBeenCalled();
      expect(quitMatchQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: "Database error",
      });
    });
  });
});
